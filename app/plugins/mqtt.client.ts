import { mqtt5, auth, iot, mqtt } from "aws-iot-device-sdk-v2";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import type { CognitoIdentityCredentials } from "@aws-sdk/credential-provider-cognito-identity/dist-types/fromCognitoIdentity";
import { toUtf8 } from "@aws-sdk/util-utf8-browser";
import { once } from "events";

interface AWSCognitoCredentialOptions {
  IdentityPoolId: string;
  Region: string;
}

class AWSCognitoCredentialsProvider extends auth.CredentialsProvider {
  private options: AWSCognitoCredentialOptions;
  private cachedCredentials?: CognitoIdentityCredentials;

  constructor(
    options: AWSCognitoCredentialOptions,
    expire_interval_in_ms?: number
  ) {
    super();
    this.options = options;

    setInterval(() => {
      this.cachedCredentials = undefined;
    }, expire_interval_in_ms || 300000); // Default to 5 minutes
  }

  getCredentials() {
    if (this.cachedCredentials) {
      return {
        aws_access_id: this.cachedCredentials.accessKeyId,
        aws_secret_key: this.cachedCredentials.secretAccessKey,
        aws_sts_token: this.cachedCredentials.sessionToken,
        aws_region: this.options.Region
      };
    }
  }

  async refreshCredentials() {
    this.cachedCredentials = await fromCognitoIdentityPool({
      identityPoolId: this.options.IdentityPoolId,
      clientConfig: { region: this.options.Region }
    })();
  }
}

function createMQTTClient(
  provider: AWSCognitoCredentialsProvider,
  awsRegion: string,
  mqttEndpoint: string
): mqtt5.Mqtt5Client {
  let wsConfig: iot.WebsocketSigv4Config = {
    credentialsProvider: provider,
    region: awsRegion
  };

  let builder: iot.AwsIotMqtt5ClientConfigBuilder =
    iot.AwsIotMqtt5ClientConfigBuilder.newWebsocketMqttBuilderWithSigv4Auth(
      mqttEndpoint,
      wsConfig
    );
  builder.withConnectProperties({
    clientId: "mqtt-client-" + Math.floor(Math.random() * 100000000),
    keepAliveIntervalSeconds: 60
  });

  let client: mqtt5.Mqtt5Client = new mqtt5.Mqtt5Client(builder.build());
  client.on("error", (error) => {
    console.log("Error event: " + error.toString());
  });

  client.on(
    "messageReceived",
    (eventData: mqtt5.MessageReceivedEvent): void => {
      if (eventData.message.payload) {
        console.log(
          "  with payload: " + toUtf8(eventData.message.payload as Buffer)
        );
      }
    }
  );

  client.on("attemptingConnect", (eventData: mqtt5.AttemptingConnectEvent) => {
    console.log("Attempting Connect event");
  });

  client.on("connectionSuccess", (eventData: mqtt5.ConnectionSuccessEvent) => {
    console.log("Connection Success event");
    console.log("Connack: " + JSON.stringify(eventData.connack));
    console.log("Settings: " + JSON.stringify(eventData.settings));
  });

  client.on("connectionFailure", (eventData: mqtt5.ConnectionFailureEvent) => {
    console.log("Connection failure event: " + eventData.error.toString());
  });

  client.on("disconnection", (eventData: mqtt5.DisconnectionEvent) => {
    console.log("Disconnection event: " + eventData.error.toString());
    if (eventData.disconnect !== undefined) {
      console.log("Disconnect packet: " + JSON.stringify(eventData.disconnect));
    }
  });

  client.on("stopped", (eventData: mqtt5.StoppedEvent) => {
    console.log("Stopped event");
  });

  return client;
}

export default defineNuxtPlugin({
  name: "mqtt-client",
  async setup(nuxtApp) {
    const runtimeConfig = useRuntimeConfig();
    const awsRegion = runtimeConfig.public.awsRegion;
    const mqttEndpoint = runtimeConfig.public.mqttEndpoint;
    let mqttClient: mqtt5.Mqtt5Client | undefined = undefined;
    const provider = new AWSCognitoCredentialsProvider({
      IdentityPoolId: runtimeConfig.public.mqttPoolId,
      Region: runtimeConfig.public.awsRegion
    });
    await provider.refreshCredentials();

    mqttClient = createMQTTClient(provider, awsRegion, mqttEndpoint);
    console.log("Created MQTT client", mqttClient);

    const attemptingConnect = once(mqttClient, "attemptingConnect");
    const connectionSuccess = once(mqttClient, "connectionSuccess");

    mqttClient.start();

    await attemptingConnect;
    await connectionSuccess;
    return {
      provide: {
        mqtt: () => mqttClient
      }
    };
  }
});
