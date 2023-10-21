//import { Configuration, OpenAIApi } from 'openai'
import OpenAI from 'openai'

/*
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)
*/

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
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

        if (!result.choices[0].message) {
            
            throw new Error("No return error from chat")

        }

        return result.choices[0].message
        
    } catch(error) {

        console.log(error.name, error.message, error.status)
    
        throw error

    }
}