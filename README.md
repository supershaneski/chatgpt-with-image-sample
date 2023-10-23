chatgpt-with-image-sample
======

This sample project integrates OpenAI's [GPT-4 Vision](), with advanced image recognition capabilities, and [DALL-E 3](), the state-of-the-art image generation model. This powerful combination allows for simultaneous image creation and analysis.

---

このサンプルプロジェクトは、OpenAIの[GPT-4 Vision]()（高度な画像認識機能を備えた）と[DALL-E 3]()（最先端の画像生成モデル）を統合しています。この強力な組み合わせにより、画像の作成と分析を同時に行うことが可能になります。


# Motivation

I started this project with the aim of utilizing image analysis with GPT-4 to study how it works and to use it as a springboard for developing other interesting and, perhaps, useful applications. However, at that time, image input functionality was not yet available. To address this limitation, I turned to ml5's ImageClassifier, which proved to be quite effective for basic object analysis. In my opinion, if your goal is to create an application like a "Bring Me" game app, it should suffice.

My interest was reignited when OpenAI announced the addition of new features to ChatGPT, including voice and vision capabilities. Nevertheless, there was no specific mention of APIs, although rumors suggested that everything would be unveiled during DevDay.

Consequently, I decided to revisit this project, picking up where I had left off. In the absence of any documentation for the API, I had to make educated guesses about how image input would be implemented, including the request parameters and response format. I also drew insights from those who had gained access to ChatGPT with image input functionality.

My assumptions led me to the following:
- Image input will be integrated into the Chat Completions API as an additional parameter.
- The parameter will be in the form of a file object, similar to other APIs.
- It should support the use of multiple files.

Based on these, calling the Chat Completion API perhaps would look like this:
```javascript
const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    files: [
        fs.createReadStream("image1.png"),
        fs.createReadStream("image2.png")
    ],
    model: "gpt-4-vision",
  });
```

Only time will tell if my assumptions are correct :P


# DALL·E 3

Since DALL·E is a separate API, I will be using ***function calling*** to trigger image creation.

```javascript
{
    "name": "create_image_dall-e",
    "description": "Create image in DALL-E based prompt provided",
    "parameters": {
        "type": "object",
        "properties": {
            "prompt": {
                "type": "string",
                "description": "The prompt based from user input"
            },
            "size": {
                "type": "string",
                "description": "The size of the image, use the default if the user does not provide any",
                "default": "256x256",
                "enum": [
                    "256x256",
                    "512x512",
                    "1024x1024"
                ]
            },
            "image_count": {
                "type": "integer",
                "description": "The number of images to generate, between 1 and 10",
                "default": 0
            }
        },
        "required": ["prompt", "size", "image_count"]
    }
}
```

After getting the result from DALL·E API, I will save the generated image to the server to make it available for image analysis, if needed. Then I send everything back to the Chat completions API for summary. I do this to add the image result in the conversation history.


# GPT-4 Vision

There are two ways to send image for analysis: 
- included when you send your message
- when your refer an image from the conversation. 

To access the later, I will be using function calling.

```javascript
{
    "name": "get_image_for_analysis",
    "description": "Get image referenced by the user from conversation history",
    "parameters": {
        "type": "object",
        "properties": {
            "image": {
                "type": "string",
                "description": "The image referenced by the user, in URL form"
            },
            "query": {
                "type": "string",
                "description": "Query of the user"
            }
        },
        "required": ["image", "query"]
    }
}
```

This will tell me which image the query is referring. 
All images in the conversation are stored in the server, including the one created by DALL·E.
This makes it easier to use them for gpt-4-vision.

---

I started this project with the aim of using image analysis with GPT-4, study how it works and use this as spring board for other interesting and perhaps useful apps. However, image input functionality was not yet available at that time. To work around this limitation, I opted for ml5's ImageClassifier, which is quite effective for basic object analysis. If your goal is to create an application like a "Bring Me" game app, it should suffice, in my opinion.

My interest was rekindled when OpenAI announced that they were adding new features to ChatGPT, including voice and vision capabilities. Nevertheless, there was no specific mention of APIs, although there were rumors that everything would be revealed during DevDay.

Consequently, I decided to revisit this project, picking up where I had left off. In the absence of any documentation for the API, I had to make educated guesses about how image input would be implemented, including the request parameters and response format. I also benefited from insights shared by those who had gained access to ChatGPT with image input functionality.

My assumptions lead me to the following:
- image input will be incorporated with the Chat Completions API as another parameter
- parameter will be file object like in other APIs
- can allow multiple files

So calling the Chat Completion API perhaps would look like this:
```javascript
const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    files: [
        fs.createReadStream("image1.png"),
        fs.createReadStream("image2.png")
    ],
    model: "gpt-4-vision",
  });
```


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
