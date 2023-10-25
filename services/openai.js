import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 2,
    timeout: 20 * 1000 // 20s
})

export async function imageCompletion({
    prompt,
    n = 1,
    response_format = 'url',
    size = '512x512'
}) {

    try {

        return await openai.images.generate({ 
            prompt,
            n,
            response_format,
            size
        })

    } catch(error) {

        throw error

    }

}

export async function chatCompletion({
    model = 'gpt-3.5-turbo-0613',
    max_tokens = 2048,
    temperature = 0,
    messages,
    functions,
    //function_call = 'auto',
}) {
    
    try {

        let options = { messages, model, temperature, max_tokens }

        if(functions) {
            options.functions = functions
        }

        const result = await openai.chat.completions.create(options)

        return result.choices[0]
        
    } catch(error) {

        console.log(error.name, error.message, error.status)
    
        throw error

    }
}