![base-chat](https://github.com/user-attachments/assets/7c1b8e04-39af-40d1-a673-b43340ba9f4c)

# Base Chat

Base Chat is a multi-tenant RAG chatbot that uses [Ragie Connect](https://www.ragie.ai/connectors?utm_source=basechat-readme) to allow users to connect and chat with their organization's knowledgebase. It is a reference application for several of [Ragie](https://www.ragie.ai/?utm_source=basechat-readme)'s features.

NOTE: This project is under active development and may include breaking changes in subsequent releases.

## Setup

Base Chat is a [nextjs](https://nextjs.org/) application. It uses the [Auth.js](https://authjs.dev/) Google provider for authentication. More information about how to configure the `AUTH_` environment variables can be found in their documentation.

1. Run `npm install`
2. Create a postgres database called `basechat`
3. Copy `env.example` to `.env`
4. Set all of the environment variables in `.env`
5. Run `npm run db:migrate` to set up the database

After you have completed setup, run `npm run dev`.

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.
