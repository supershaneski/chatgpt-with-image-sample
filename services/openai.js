import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 4,
    timeout: 60 * 1000
})

export async function imageCompletion({
    model = 'dall-e-3',
    prompt,
    n = 1,
    response_format = 'url',
    size = '1024x1024', //'512x512'
    style = 'vivid', // vivid, natural
}) {

    if(model === 'dall-e-2') {
        size = '512x512'
    }

    let options = {
        model,
        prompt,
        response_format,
        size,
        n,
        style
    }

    try {

        return await openai.images.generate(options)

    } catch(error) {

        console.log(error)

        throw error

    }

}

export async function chatCompletion({
    model = 'gpt-3.5-turbo-1106', //'gpt-3.5-turbo-0613',
    max_tokens = 2048,
    temperature = 0,
    messages,
    tools,
}) {
    
    try {

        let options = { messages, model, temperature, max_tokens }

        if(tools) {
            options.tools = tools
        }

        const result = await openai.chat.completions.create(options)

        return result.choices[0]
        
    } catch(error) {

        console.log(error.name, error.message, error.status)
    
        throw error

    }
}