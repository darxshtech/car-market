# Twilio AI Assistant Setup Guide

This guide will walk you through setting up your Twilio account and AI Assistant for the DriveSphere marketplace integration.

## Prerequisites

- A Twilio account (free trial or paid)
- Access to the Twilio Console
- Your DriveSphere application running locally or deployed

## Step 1: Create or Access Your Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a new account or log in to your existing account
3. Complete the verification process (phone number verification)

## Step 2: Get Your Account Credentials

1. Navigate to the [Twilio Console Dashboard](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** in the "Account Info" section
3. Copy these values - you'll need them for your `.env.local` file

## Step 3: Create a Twilio AI Assistant (Autopilot)

1. In the Twilio Console, navigate to **Explore Products** → **AI Assistants** (formerly Autopilot)
2. Click **Create new Assistant**
3. Configure your assistant:
   - **Name**: DriveSphere Car Assistant
   - **Description**: AI assistant for car marketplace queries
   - **Language**: English (or your preferred language)
4. Click **Create**
5. Copy the **Assistant SID** (starts with "UA...")

## Step 4: Configure Basic Assistant Settings

### Set Up Intents (Tasks)

Create the following tasks in your assistant:

#### 1. SearchCarsIntent
- **Unique Name**: `search_cars`
- **Sample Utterances**:
  - "Show me cars under $20,000"
  - "I'm looking for a Honda in Lagos"
  - "Find automatic transmission cars"
  - "What cars do you have available?"

#### 2. CarDetailsIntent
- **Unique Name**: `car_details`
- **Sample Utterances**:
  - "Tell me more about this car"
  - "What are the details of listing [ID]"
  - "Show me the full specs"

#### 3. SellerAssistIntent
- **Unique Name**: `seller_assist`
- **Sample Utterances**:
  - "Show me my listings"
  - "How many people are interested in my car?"
  - "What's the status of my listing?"
  - "How do I update my car listing?"

#### 4. ContactSellerIntent
- **Unique Name**: `contact_seller`
- **Sample Utterances**:
  - "I want to contact the seller"
  - "How can I reach the owner?"
  - "I'm interested in this car"

### Configure Fallback Behavior

1. Go to **Assistant Settings** → **Fallback**
2. Set a friendly fallback message:
   ```
   I'm not sure I understood that. I can help you search for cars, get details about listings, manage your listings if you're a seller, or contact sellers. What would you like to do?
   ```

## Step 5: Set Up Webhook URL

1. In your assistant settings, go to **Webhooks**
2. Set the webhook URL to your application endpoint:
   - **Development**: `http://localhost:3000/api/chat/webhook`
   - **Production**: `https://yourdomain.com/api/chat/webhook`
3. Enable webhook for all task events

## Step 6: Update Environment Variables

Update your `.env.local` file with the credentials you collected:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_ASSISTANT_SID=UAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Twilio Webhook Configuration
TWILIO_WEBHOOK_URL=http://localhost:3000/api/chat/webhook

# Chat Session Configuration
CHAT_SESSION_TIMEOUT=1800000  # 30 minutes
CHAT_MAX_HISTORY=50
```

## Step 7: Test Your Configuration

1. Restart your Next.js development server
2. The chat widget should now be able to connect to Twilio
3. Test basic queries to ensure the integration is working

## Step 8: Build and Deploy Your Assistant

1. In the Twilio Console, go to your assistant
2. Click **Build Model** to train your assistant with the sample utterances
3. Wait for the build to complete (usually takes 1-2 minutes)
4. Your assistant is now ready to use!

## Troubleshooting

### Common Issues

**Issue**: "Invalid credentials" error
- **Solution**: Double-check your Account SID and Auth Token in `.env.local`

**Issue**: Webhook not receiving requests
- **Solution**: 
  - Ensure your webhook URL is publicly accessible (use ngrok for local development)
  - Verify the webhook URL is correctly configured in Twilio Console

**Issue**: Assistant not understanding queries
- **Solution**: 
  - Add more sample utterances to your tasks
  - Rebuild the model after adding new utterances

### Using ngrok for Local Development

If you need to test webhooks locally:

1. Install ngrok: `npm install -g ngrok`
2. Start your Next.js app: `npm run dev`
3. In another terminal, run: `ngrok http 3000`
4. Copy the HTTPS URL provided by ngrok
5. Update your webhook URL in Twilio Console to: `https://your-ngrok-url.ngrok.io/api/chat/webhook`

## Next Steps

Once your Twilio account and assistant are configured:

1. Proceed to implement the database models (Task 2)
2. Create the Twilio integration layer (Task 3)
3. Build the API routes (Task 4)
4. Implement the chat widget UI (Task 5)

## Resources

- [Twilio AI Assistant Documentation](https://www.twilio.com/docs/autopilot)
- [Twilio Node.js SDK Documentation](https://www.twilio.com/docs/libraries/node)
- [Twilio Conversations API](https://www.twilio.com/docs/conversations)

## Security Notes

⚠️ **Important Security Reminders**:

- Never commit your `.env.local` file to version control
- Keep your Auth Token secret and rotate it regularly
- Use environment-specific credentials (separate for dev/staging/production)
- Enable webhook signature verification in production
- Implement rate limiting on your webhook endpoints
