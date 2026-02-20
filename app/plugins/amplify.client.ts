import { Amplify } from "aws-amplify";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public;
  const identityPoolId = String(config.cognitoIdentityPoolId || "");

  Amplify.configure(
    {
      Auth: {
        Cognito: {
          identityPoolId,
          allowGuestAccess: true
        }
      },
      API: {
        GraphQL: {
          endpoint: config.appSyncEndpoint,
          defaultAuthMode: "iam",
          region: config.awsRegion
        }
      }
    }
    // {
    //   API: {
    //     GraphQL: {
    //       withCredentials: true
    //     }
    //   }
    // }
  );
});
