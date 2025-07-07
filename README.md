![base-chat](https://github.com/user-attachments/assets/7c1b8e04-39af-40d1-a673-b43340ba9f4c)

# Base Chat

Base Chat is a multi-tenant RAG chatbot that uses [Ragie Connect](https://www.ragie.ai/connectors?utm_source=basechat-readme) to allow users to connect and chat with their organization's knowledgebase. It serves as a reference application showcasing [Ragie](https://www.ragie.ai/?utm_source=basechat-readme)'s features.

> **NOTE**: This project is under active development and may include breaking changes in subsequent releases.

## Features

- **Multi-tenant Architecture**: Support for multiple organizations in a single deployment
- **RAG (Retrieval-Augmented Generation)**: AI responses enhanced with knowledge from your organization's documents
- **Knowledge Management**: Connect to various data sources through Ragie Connect
- **Authentication**: Secure login using Auth.js with Google provider support
- **Customization**: Add your organization's logo and customize the chat interface
- **Multiple LLM Support**: Compatible with OpenAI, Google AI, Anthropic, and Groq

## Prerequisites

- Node.js 22+
- PostgreSQL database
- Ragie API key (get one at [ragie.ai](https://ragie.ai))
- API keys for supported LLM providers (OpenAI, Google AI, Anthropic, or Groq)
- Google OAuth credentials (for authentication)

## Setup

Base Chat is built with [Next.js](https://nextjs.org/) and uses [Auth.js](https://authjs.dev/) for authentication.

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/ragieai/basechat.git
   cd basechat
   npm install
   ```

2. **Database setup**

   ```bash
   # Create PostgreSQL database
   createdb basechat
   ```

3. **Environment configuration**

   ```bash
   # Copy environment variables template
   cp env.example .env

   # Edit .env file to add required credentials and configuration
   # Required minimums:
   # - DATABASE_URL
   # - RAGIE_API_KEY
   # - At least one LLM provider API key (OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, etc.)
   # - AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET
   # - ENCRYPTION_KEY (generate with: openssl rand -hex 32)
   # - DEFAULT_PARTITION_LIMIT
   ```

4. **Set up database schema**

   ```bash
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:3000.

## Docker Deployment

Base Chat includes Docker support for easy deployment:

```bash
# Build Docker image
docker build -t basechat .

# Run container (adjust environment variables as needed)
docker run -p 3000:3000 --env-file .env basechat
```

## Environment Variables

Key environment variables include:

| Variable                     | Description                              | Required         |
| ---------------------------- | ---------------------------------------- | ---------------- |
| DATABASE_URL                 | PostgreSQL connection string             | Yes              |
| RAGIE_API_KEY                | API key from Ragie                       | Yes              |
| OPENAI_API_KEY               | OpenAI API key                           | One LLM required |
| GOOGLE_GENERATIVE_AI_API_KEY | Google AI API key                        | One LLM required |
| ANTHROPIC_API_KEY            | Anthropic API key                        | One LLM required |
| GROQ_API_KEY                 | Groq API key                             | One LLM required |
| AUTH_GOOGLE_ID               | Google OAuth client ID                   | Yes              |
| AUTH_GOOGLE_SECRET           | Google OAuth client secret               | Yes              |
| ENCRYPTION_KEY               | 32-byte hex key for encryption           | Yes              |
| STORAGE\_\*                  | Object storage settings for logo uploads | No               |

See `env.example` for a complete list of configuration options.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run update-api-key` - Update your Ragie API key

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

## Links

- [Base Chat Product Website](https://www.ragie.ai/basechat?utm_source=basechat-readme)
- [Ragie Website](https://www.ragie.ai/?utm_source=basechat-readme)
- [Ragie Documentation](https://docs.ragie.ai/?utm_source=basechat-readme)
- [Ragie Connectors](https://www.ragie.ai/connectors?utm_source=basechat-readme)
