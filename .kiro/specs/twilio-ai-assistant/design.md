# Twilio AI Assistant Integration - Design Document

## Overview

This design document outlines the architecture and implementation approach for integrating Twilio's AI Assistant into the car marketplace application. The integration will provide intelligent, conversational support for users browsing cars, sellers managing listings, and general customer service inquiries.

The system will use Twilio's Autopilot (now part of Twilio AI Assistant) to create a conversational AI that can understand natural language, maintain context, and perform actions like searching listings, providing car details, and managing user interests.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         ├─── Chat UI Component
         │
         ▼
┌─────────────────┐
│   API Routes    │
│  /api/chat/*    │
└────────┬────────┘
         │
         ├─── Session Management
         ├─── Message Processing
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Twilio AI      │◄────►│   MongoDB        │
│  Assistant SDK  │      │   (Conversations │
└────────┬────────┘      │    & Context)    │
         │               └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Twilio Cloud   │
│  AI Assistant   │
└─────────────────┘
```

### Component Breakdown

1. **Chat UI Component** (Frontend)
   - Floating chat widget
   - Message input and display
   - Typing indicators
   - Quick reply buttons
   - File/image upload support

2. **API Routes** (Backend)
   - `/api/chat/send` - Send user message
   - `/api/chat/history` - Get conversation history
   - `/api/chat/session` - Create/manage sessions
   - `/api/chat/webhook` - Twilio webhook handler

3. **Twilio Integration Layer**
   - Assistant configuration
   - Intent handlers
   - Context management
   - Response formatting

4. **Database Layer**
   - Conversation storage
   - Session management
   - User context
   - Analytics data

## Components and Interfaces

### 1. Chat UI Component

```typescript
// components/ChatWidget.tsx
interface ChatWidgetProps {
  userId?: string;
  isAuthenticated: boolean;
  initialMessage?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    listings?: string[];
    actions?: Action[];
  };
}

interface Action {
  type: 'view_listing' | 'contact_seller' | 'save_search';
  label: string;
  data: any;
}
```

### 2. API Interfaces

```typescript
// app/api/chat/send/route.ts
interface SendMessageRequest {
  sessionId: string;
  message: string;
  userId?: string;
  context?: {
    currentPage?: string;
    viewingListingId?: string;
  };
}

interface SendMessageResponse {
  success: boolean;
  message: Message;
  suggestions?: string[];
  actions?: Action[];
}

// app/api/chat/session/route.ts
interface CreateSessionRequest {
  userId?: string;
}

interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  expiresAt: Date;
}
```

### 3. Twilio Assistant Configuration

```typescript
// lib/twilio/assistant.ts
interface AssistantConfig {
  assistantSid: string;
  tasks: Task[];
  modelBuild: ModelBuild;
}

interface Task {
  uniqueName: string;
  actions: {
    actions: TaskAction[];
  };
  fields: Field[];
}

interface TaskAction {
  say?: string;
  collect?: CollectAction;
  redirect?: string;
}
```

### 4. Intent Handlers

```typescript
// lib/twilio/intents/
interface IntentHandler {
  name: string;
  handle: (params: IntentParams) => Promise<IntentResponse>;
}

interface IntentParams {
  query: string;
  context: ConversationContext;
  userId?: string;
}

interface IntentResponse {
  message: string;
  data?: any;
  actions?: Action[];
  updateContext?: Partial<ConversationContext>;
}
```

## Data Models

### Conversation Model

```typescript
// lib/models/Conversation.ts
interface IConversation extends Document {
  sessionId: string;
  userId?: Types.ObjectId;
  messages: ConversationMessage[];
  context: ConversationContext;
  status: 'active' | 'ended' | 'expired';
  startedAt: Date;
  lastMessageAt: Date;
  expiresAt: Date;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  confidence?: number;
  metadata?: any;
}

interface ConversationContext {
  lastIntent?: string;
  referencedListings: string[];
  searchFilters?: {
    brand?: string;
    priceMin?: number;
    priceMax?: number;
    city?: string;
  };
  userPreferences?: {
    fuelType?: string;
    transmission?: string;
  };
}
```

### Analytics Model

```typescript
// lib/models/ChatAnalytics.ts
interface IChatAnalytics extends Document {
  date: Date;
  totalConversations: number;
  totalMessages: number;
  averageResponseTime: number;
  topIntents: {
    intent: string;
    count: number;
  }[];
  userSatisfaction?: number;
  failedIntents: {
    query: string;
    count: number;
  }[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Message delivery consistency
*For any* user message sent to the AI assistant, the system should store the message in the database and receive a response from Twilio within 5 seconds, or return an error.
**Validates: Requirements 6.2**

### Property 2: Session context preservation
*For any* conversation session, when a user sends multiple messages, the context from previous messages should be available to subsequent message handlers within the same session.
**Validates: Requirements 3.1, 3.2**

### Property 3: Authentication-based data access
*For any* request to view user-specific data (seller listings, saved searches), the system should only return data if the user is authenticated and authorized to access it.
**Validates: Requirements 8.4**

### Property 4: Intent classification accuracy
*For any* user query about car listings, the system should correctly identify the intent (search, details, contact) and route to the appropriate handler.
**Validates: Requirements 7.1**

### Property 5: Response time guarantee
*For any* user message, the system should return a response within 3 seconds under normal load conditions.
**Validates: Requirements 6.2**

### Property 6: Session expiration handling
*For any* conversation session that exceeds the timeout period (30 minutes of inactivity), the system should mark it as expired and clear the context.
**Validates: Requirements 3.3, 3.4**

### Property 7: Graceful degradation
*For any* scenario where Twilio services are unavailable, the system should return a fallback message and not crash or hang indefinitely.
**Validates: Requirements 6.4**

### Property 8: Data encryption in transit
*For any* message sent between the client and server, the system should use HTTPS/TLS encryption.
**Validates: Requirements 8.1**

### Property 9: PII anonymization in logs
*For any* conversation log stored in the database, personally identifiable information (email, phone, name) should be masked or anonymized.
**Validates: Requirements 8.2**

### Property 10: Interest recording accuracy
*For any* user expressing interest in a car through the AI assistant, the system should increment the interest count for that listing and create a notification for the seller.
**Validates: Requirements 4.1**

## Error Handling

### Error Categories

1. **Twilio API Errors**
   - Rate limiting (429)
   - Authentication failures (401)
   - Service unavailable (503)
   - Invalid request (400)

2. **Database Errors**
   - Connection failures
   - Query timeouts
   - Validation errors

3. **Business Logic Errors**
   - Invalid session
   - Unauthorized access
   - Listing not found
   - Invalid intent

### Error Handling Strategy

```typescript
// lib/twilio/errorHandler.ts
class TwilioErrorHandler {
  handle(error: Error): ErrorResponse {
    if (error instanceof TwilioApiError) {
      return this.handleTwilioError(error);
    }
    if (error instanceof DatabaseError) {
      return this.handleDatabaseError(error);
    }
    return this.handleGenericError(error);
  }

  private handleTwilioError(error: TwilioApiError): ErrorResponse {
    switch (error.code) {
      case 429:
        return {
          message: "I'm receiving a lot of requests right now. Please try again in a moment.",
          retryAfter: 5000,
        };
      case 503:
        return {
          message: "I'm temporarily unavailable. You can browse listings or contact support directly.",
          fallbackActions: ['browse_listings', 'contact_support'],
        };
      default:
        return {
          message: "I encountered an issue. Let me try that again.",
          shouldRetry: true,
        };
    }
  }
}
```

### Retry Logic

```typescript
// lib/twilio/retry.ts
async function sendWithRetry(
  message: string,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await twilioClient.send(message);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === maxRetries) {
        throw error;
      }
      await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
    }
  }
  
  throw lastError;
}
```

## Testing Strategy

### Unit Tests

1. **Intent Handler Tests**
   - Test each intent handler with various inputs
   - Verify correct database queries
   - Check response formatting

2. **Context Management Tests**
   - Test context preservation across messages
   - Verify context expiration
   - Test context updates

3. **Error Handling Tests**
   - Test all error scenarios
   - Verify fallback messages
   - Test retry logic

### Integration Tests

1. **Twilio Integration Tests**
   - Test message sending
   - Test webhook handling
   - Test session management

2. **Database Integration Tests**
   - Test conversation storage
   - Test analytics recording
   - Test query performance

### End-to-End Tests

1. **User Flow Tests**
   - Test complete conversation flows
   - Test car search scenarios
   - Test seller assistance flows

2. **Performance Tests**
   - Test response times under load
   - Test concurrent conversations
   - Test database query performance

### Property-Based Tests

Property-based tests will be implemented using `fast-check` library for JavaScript/TypeScript to verify the correctness properties defined above.

```typescript
// __tests__/chat.property.test.ts
import fc from 'fast-check';

describe('Chat Property Tests', () => {
  test('Property 1: Message delivery consistency', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (message) => {
          const response = await sendMessage(message);
          expect(response.success).toBe(true);
          expect(response.responseTime).toBeLessThan(5000);
        }
      )
    );
  });

  test('Property 2: Session context preservation', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
        async (messages) => {
          const sessionId = await createSession();
          const contexts = [];
          
          for (const message of messages) {
            const response = await sendMessage(message, sessionId);
            contexts.push(response.context);
          }
          
          // Verify context accumulates
          for (let i = 1; i < contexts.length; i++) {
            expect(contexts[i].messageCount).toBeGreaterThan(contexts[i-1].messageCount);
          }
        }
      )
    );
  });
});
```

## Security Considerations

### 1. API Key Management
- Store Twilio credentials in environment variables
- Use different keys for development and production
- Rotate keys regularly
- Never expose keys in client-side code

### 2. Authentication & Authorization
- Verify user authentication before accessing personal data
- Implement rate limiting per user/IP
- Validate all user inputs
- Sanitize messages before storing

### 3. Data Privacy
- Anonymize PII in conversation logs
- Implement data retention policies (90 days)
- Provide user data export/deletion
- Comply with GDPR/privacy regulations

### 4. Webhook Security
- Verify Twilio webhook signatures
- Use HTTPS for all webhook endpoints
- Implement request validation
- Rate limit webhook endpoints

## Performance Optimization

### 1. Caching Strategy
```typescript
// Cache frequently accessed data
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getListingWithCache(id: string) {
  const cached = cache.get(`listing:${id}`);
  if (cached) return cached;
  
  const listing = await Listing.findById(id);
  cache.set(`listing:${id}`, listing);
  return listing;
}
```

### 2. Database Indexing
```typescript
// Optimize conversation queries
ConversationSchema.index({ sessionId: 1 });
ConversationSchema.index({ userId: 1, lastMessageAt: -1 });
ConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### 3. Response Streaming
```typescript
// Stream responses for better perceived performance
async function* streamResponse(message: string) {
  const response = await twilioClient.send(message);
  const words = response.split(' ');
  
  for (const word of words) {
    yield word + ' ';
    await delay(50); // Simulate typing
  }
}
```

## Deployment Considerations

### Environment Variables
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_ASSISTANT_SID=UAxxxxx
TWILIO_WEBHOOK_URL=https://yourdomain.com/api/chat/webhook
CHAT_SESSION_TIMEOUT=1800000  # 30 minutes
CHAT_MAX_HISTORY=50
```

### Monitoring & Logging
- Log all Twilio API calls
- Track response times
- Monitor error rates
- Set up alerts for failures
- Track user satisfaction metrics

### Scaling Considerations
- Use connection pooling for database
- Implement message queuing for high load
- Consider serverless functions for webhooks
- Use CDN for static chat assets
- Implement horizontal scaling for API routes

## Future Enhancements

1. **Voice Integration**
   - Add voice call support through Twilio Voice
   - Speech-to-text for voice queries
   - Text-to-speech for responses

2. **Multi-language Support**
   - Detect user language
   - Translate messages
   - Localized responses

3. **Advanced Analytics**
   - Sentiment analysis
   - Conversation flow visualization
   - User journey tracking
   - A/B testing for responses

4. **Proactive Messaging**
   - Send notifications about new listings
   - Price drop alerts
   - Saved search updates

5. **Integration with Other Services**
   - WhatsApp Business API
   - Facebook Messenger
   - SMS fallback
