import { Configuration, OpenAIApi } from 'openai'

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)

export async function chatCompletion({
    model = 'gpt-3.5-turbo-0613',
    temperature = 0,
    messages,
    functions,
    //function_call = 'auto',
}) {
    
    try {

        let options = { messages, model, temperature }

        if(functions) {
            options.functions = functions
        }

        const result = await openai.createChatCompletion(options)

        if (!result.data.choices[0].message) {
            
            throw new Error("No return error from chat")

        }

        //console.log(result.data)

        return result.data.choices[0].message
        
    } catch(error) {

        console.log(error)
        
        throw error

    }
}