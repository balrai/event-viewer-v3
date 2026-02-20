// AppSync GraphQL API Resources

export const appSyncConfig = {
  name: "EventViewerAPI",
  authenticationType: "API_KEY" as const,
  region: process.env.AWS_REGION || "us-east-1",
  graphqlEndpoint: process.env.APPSYNC_GRAPHQL_ENDPOINT || "",
  apiKey: process.env.APPSYNC_API_KEY || ""
};

export const schema = /* GraphQL */ `
  type Event {
    id: ID!
    title: String!
    description: String
    date: AWSDateTime!
    location: String
    organizer: String
    status: EventStatus
    createdAt: AWSDateTime
    updatedAt: AWSDateTime
  }

  enum EventStatus {
    DRAFT
    PUBLISHED
    CANCELLED
    COMPLETED
  }

  input CreateEventInput {
    title: String!
    description: String
    date: AWSDateTime!
    location: String
    organizer: String
    status: EventStatus
  }

  input UpdateEventInput {
    id: ID!
    title: String
    description: String
    date: AWSDateTime
    location: String
    organizer: String
    status: EventStatus
  }

  type Query {
    getEvent(id: ID!): Event
    listEvents(limit: Int, nextToken: String): EventConnection
  }

  type Mutation {
    createEvent(input: CreateEventInput!): Event
    updateEvent(input: UpdateEventInput!): Event
    deleteEvent(id: ID!): Event
    updateProfile(input: UpdateProfileInput!): UserProfile
  }

  type Subscription {
    onCreateEvent: Event @aws_subscribe(mutations: ["createEvent"])
    onUpdateEvent: Event @aws_subscribe(mutations: ["updateEvent"])
    onDeleteEvent: Event @aws_subscribe(mutations: ["deleteEvent"])
  }

  type EventConnection {
    items: [Event]
    nextToken: String
  }
`;

// GraphQL Operations
export const queries = {
  getEvent: /* GraphQL */ `
    query GetEvent($id: ID!) {
      getEvent(id: $id) {
        id
        title
        description
        date
        location
        organizer
        status
        createdAt
        updatedAt
      }
    }
  `,
  listEvents: /* GraphQL */ `
    query ListEvents($limit: Int, $nextToken: String) {
      listEvents(limit: $limit, nextToken: $nextToken) {
        items {
          id
          title
          description
          date
          location
          organizer
          status
          createdAt
          updatedAt
        }
        nextToken
      }
    }
  `
};

export const mutations = {
  createEvent: /* GraphQL */ `
    mutation CreateEvent($input: CreateEventInput!) {
      createEvent(input: $input) {
        id
        title
        description
        date
        location
        organizer
        status
        createdAt
        updatedAt
      }
    }
  `,
  updateEvent: /* GraphQL */ `
    mutation UpdateEvent($input: UpdateEventInput!) {
      updateEvent(input: $input) {
        id
        title
        description
        date
        location
        organizer
        status
        createdAt
        updatedAt
      }
    }
  `,
  deleteEvent: /* GraphQL */ `
    mutation DeleteEvent($id: ID!) {
      deleteEvent(id: $id) {
        id
        title
      }
    }
  `
};

export const subscriptions = {
  onCreateEvent: /* GraphQL */ `
    subscription OnCreateEvent {
      onCreateEvent {
        id
        title
        description
        date
        location
        organizer
        status
      }
    }
  `,
  onUpdateEvent: /* GraphQL */ `
    subscription OnUpdateEvent {
      onUpdateEvent {
        id
        title
        description
        date
        location
        organizer
        status
      }
    }
  `,
  onDeleteEvent: /* GraphQL */ `
    subscription OnDeleteEvent {
      onDeleteEvent {
        id
        title
      }
    }
  `
};
