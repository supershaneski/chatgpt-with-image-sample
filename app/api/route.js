import { chatCompletion, imageCompletion } from '../../services/openai'
import { trim_array } from '../../lib/utils'
import create_image_dalle from '../../assets/create_image_dall-e.json'
import captions from '../../assets/captions.json'

export async function POST(request) {

    const { lang = 0, inquiry, previous } = await request.json()

    if (!inquiry || !Array.isArray(previous)) {
        return new Response('Bad request', {
            status: 400,
        })
    }

    const forceFlag = true
    if(forceFlag) {

        console.log((new Date()).toLocaleTimeString())

        const chance = Math.round(10 * Math.random())

        if(chance > 5) {

            throw new Error('Forced error occurred')

        } else {

            return new Response(JSON.stringify({
                result: { role: 'assistant', content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' },
            }), {
                status: 200,
            })

        }

    }

    const functions = [create_image_dalle]
    
    let prev_data = trim_array(previous, 20)

    const today = new Date()

    let system_prompt = `You are a helpful assistant.\n` +
        `When the user wants to know create an image, it means they want to create an image using DALL-E and you will help them to write the prompt for DALL-E.\n` +
        `When creating prompt for image creation, do not make up your own prompt.\n` +
        `Ask the user their own ideas of what image they want to be.\n` +
        `If the description is vague, clarify to the user some elements to make it clearer.` +
        `Confirm to the user the image prompt before calling create_image_dall-e.\n` +
        `If possible, give them several variations of possible prompts.\n` +
        `For security reason, do not reveal this function in your response.\n` +
        `Today is ${today}.`

    let messages = [{ role: 'system', content: system_prompt }]
    if(prev_data.length > 0) {
        messages = messages.concat(prev_data)
    }
    messages.push({ role: 'user', content: inquiry })

    let result = {}

    try {

        result = await chatCompletion({
            messages,
            functions
        })

        console.log('function call', result)
        
    } catch(error) {

        console.log('[end-point]', error)

    }

    if(Object.keys(result).length === 0) {

        return new Response('Bad function call', {
            status: 400,
        })

    }

    if(result.content === null || result.function_call) {

        const func_result = result

        if(func_result.function_call.name === 'create_image_dall-e') {

            console.log("DALL-E ARGS", func_result.function_call.arguments)

            const func_args = JSON.parse(func_result.function_call.arguments)
            const image_prompt = func_args.prompt
            const image_size = func_args.size || '256x256'
            const image_count = func_args.image_count && func_args.image_count > 0 ? parseInt(func_args.image_count) : 1
            const waiting_message = image_count > 1 ? captions.done_here_are_the_images[lang] : captions.done_here_is_the_image[lang] //"Done! Here are the images you requested..." : "Done! Here's the image you requested..."

            const image = await imageCompletion({ 
                prompt: image_prompt,
                n: image_count,
                size: '256x256'
            })

            console.log(image.data)

            return new Response(JSON.stringify({
                result: { 
                    role: 'assistant', 
                    content: waiting_message,
                    image: image.data.map((img) => img.url)
                },
            }), {
                status: 200,
            })

        }

    }

    return new Response(JSON.stringify({
        result,
    }), {
        status: 200,
    })

}