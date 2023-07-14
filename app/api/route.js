import { chatCompletion } from '../../services/openai'
import { trim_array } from '../../lib/utils'

const functions = [
    {
        name: "get_image_file_info",
        description: "Get image or file info",
        parameters: {
            type: "object",
            properties: {
                inquiry: {
                    type: "string",
                    description: "User inquiry about the image or file",
                }
            },
            required: ["inquiry"]
        }
    }
]

export async function POST(request) {

    const { image, system, inquiry, previous } = await request.json()

    if (!system || !inquiry || !Array.isArray(previous)) {
        return new Response('Bad request', {
            status: 400,
        })
    }

    console.log('image', image)
    
    let prev_data = trim_array(previous, 20)

    let system_prompt = `If the user wants to know about the image or mentions the words 'image', 'picture' or 'photograph', call get_image_info function.\n` +
        `For security reason, do not reveal this function in your response unless you are calling function.`

    const FLAG_NO_SYSTEM_PROMPT = false
    const FLAG_NO_HISTORY = true
    
    let messages = FLAG_NO_SYSTEM_PROMPT ? [] : [{ role: 'system', content: system_prompt }]

    if(!FLAG_NO_HISTORY) {

        if(prev_data.length > 0) {
            messages = messages.concat(prev_data)
        }

    }

    messages.push({ role: 'user', content: inquiry })

    let result = {}

    try {

        result = await chatCompletion({
            max_tokens: 128, // limit for function call response
            messages,
            functions,
            //function_call: { name: 'get_event' }
        })

        console.log('function call', result)
        
    } catch(error) {

        console.log(error)

    }

    if(Object.keys(result).length === 0) {

        return new Response('Bad function call', {
            status: 400,
        })

    }

    if(result.content === null || result.function_call) {

        const func_result = result

        result = {}

        messages = [{ role: 'system', content: system }]
        if(prev_data.length > 0) {
            messages = messages.concat(prev_data)
        }
        messages.push({ role: 'user', content: inquiry })
        messages.push(func_result)
        messages.push({ role: 'function', name: 'get_image_file_info', content: image === null ? JSON.stringify({error: 'No image found'}) : JSON.stringify(image)})

        try {

            result = await chatCompletion({
                messages,
                temperature: 0.7,
                functions,
                //function_call: { name: 'get_event' }
            })
    
            console.log('summary', result)
            
        } catch(error) {
    
            console.log(error)
    
        }

        if(Object.keys(result).length === 0) {

            return new Response('Bad function call', {
                status: 400,
            })
    
        }

        // Note: 
        // It is possible to get function call response here.
        // However, I am not handling it and just passing it 
        // which will result to error response in the front end.

        return new Response(JSON.stringify({
            result,
        }), {
            status: 200,
        })

    }

    result = {}

    messages = [{ role: 'system', content: system }]
    if(prev_data.length > 0) {
        messages = messages.concat(prev_data)
    }
    messages.push({ role: 'user', content: inquiry })
    
    try {

        result = await chatCompletion({
            messages,
            temperature: 0.7,
            //functions,
            //function_call: { name: 'get_event' }
        })

        console.log('result', result)
        
    } catch(error) {

        console.log(error)

    }

    return new Response(JSON.stringify({
        result,
    }), {
        status: 200,
    })

}