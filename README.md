chatgpt-with-image-sample
======

This sample project integrates OpenAI's [GPT-4 Vision](), with advanced image recognition capabilities, and [DALL-E 3](), the state-of-the-art image generation model. This powerful combination allows for simultaneous image creation and analysis.

---

このサンプルプロジェクトは、OpenAIの[GPT-4 Vision]()（高度な画像認識機能を備えた）と[DALL-E 3]()（最先端の画像生成モデル）を統合しています。この強力な組み合わせにより、画像の作成と分析を同時に行うことが可能になります。


# Screenshot

Upload an image or take a photo (for mobile users) and start chatting about it.

<picture>
 <source media="(prefers-color-scheme: dark)" srcset="./docs/screenshot1.png">
 <source media="(prefers-color-scheme: light)" srcset="./docs/screenshot2.png">
 <img alt="Screenshot" src="./docs/screenshot2.png">
</picture>



# Setup

Clone the repository and install the dependencies

```sh
git clone https://github.com/supershaneski/chatgpt-with-image-sample.git myproject

cd myproject

npm install
```

Copy `.env.example` and rename it to `.env` then edit the `OPENAI_API_KEY` and use your own `OpenAI API key`.

```javascript
OPENAI_API_KEY=YOUR-OPENAI-API-KEY
```

Then run the app

```sh
npm run dev
```

Open your browser to `http://localhost:4000/` to load the application page.
