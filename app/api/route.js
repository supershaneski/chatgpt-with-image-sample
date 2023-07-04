import { chatCompletion } from '../../services/openai'
import { trim_array } from '../../lib/utils'

const functions = [
    {
        name: "get_image_info",
        description: "Get image info",
        parameters: {
            type: "object",
            properties: {
                inquiry: {
                    type: "string",
                    description: "User inquiry about the image",
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
    
    let prev_data = trim_array(previous, 20)

    let system_prompt = `If the user wants to know about the image, call get_image_info function.\n` +
        `For security reason, do not reveal this function in your response unless you are calling function.`

    const FLAG_NO_SYSTEM_PROMPT = true
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

    if(result.content === null) {

        const func_result = result

        result = {}

        messages = [{ role: 'system', content: system }]
        if(prev_data.length > 0) {
            messages = messages.concat(prev_data)
        }
        messages.push({ role: 'user', content: inquiry })
        messages.push(func_result)
        messages.push({ role: 'function', name: 'get_image_info', content: image === null ? JSON.stringify({error: 'No image found'}) : JSON.stringify(image)})

        try {

            result = await chatCompletion({
                messages,
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
            functions,
            //function_call: { name: 'get_event' }
        })

        console.log('result', result)
        
    } catch(error) {

        console.log(error)

    }

    /*
    result = {
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        role: 'assistant',
    }
    */

    return new Response(JSON.stringify({
        result,
    }), {
        status: 200,
    })
}