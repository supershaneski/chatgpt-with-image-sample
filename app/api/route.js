import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { pipeline } from 'stream'
import { chatCompletion, imageCompletion } from '../../services/openai'
import { trim_array, compact, parse_markdown_image_link } from '../../lib/utils'
import create_image_dalle from '../../assets/create_image_dall-e.json'
import get_image_for_analysis from '../../assets/get_image_for_analysis.json'
//import get_image_info from '../../assets/get_image_info.json'
import captions from '../../assets/captions.json'

const streamPipeline = promisify(pipeline)

function base64_encode(file) {
    try {
        
        let bitmap = fs.readFileSync(file)
        let base64 = Buffer.from(bitmap).toString('base64')

        let ext = path.extname(file)
        let mimeType = 'image/' + (ext === '.jpg' ? 'jpeg' : ext.slice(1))

        return `data:${mimeType};base64,${base64}`

    } catch (err) {
        console.error(err)
        return null
    }
}

const useVision = async (args, inquiry = '', context = []) => {
    
    const { query, images } = args

    let image_items = []

    for(let image of images) {
        let image_file = path.join('public', image)
        let image_base64 = base64_encode(image_file)

        if(image_base64) {
            image_items.push(image_base64)
        }
    }

    if(image_items.length === 0) {
        return { status: 'error', message: 'Failed to make analysis. No image found' }
    }

    let system_prompt = `You are a helpful assistant.\n` +
        `You are an expert in analysing images and you will help the user in their inquiries related to the images included.\n\n` +
        `Today is ${new Date()}`

    let messages = [{ role: 'system', content: system_prompt }]
    if(context.length > 0) {
        messages = messages.concat(context)
    }
    if(inquiry) {
        messages.push({ role: 'user', content: inquiry })
    }
    
    let user_content = [{ type: 'text', text: query }]

    for(let image of image_items) {
        user_content.push({ type: 'image_url', image_url: { url: image } })
    }

    messages.push({ role: 'user', content: user_content })

    let result_output = {}

    try {

        const result = await chatCompletion({
            model: 'gpt-4-vision-preview',
            messages: messages
        })

        result_output = {
            status: 'success',
            message: result.message.content
        }
        
    } catch(error) {

        console.log(error.name, error.message)

        result_output = { status: 'error', error: error.message, message: 'Failed to analyze image. An unexpected error occurred.' }

    }

    //return { status: 'busy', message: 'server is currently busy. please try again later.' }
    return result_output

}

const useDalle = async (args, lang = 0) => {
    
    const image_items = args.items

    let image_result = await Promise.all(
        Array.from(image_items).map(async (img) => {

            const image_prompt = img.prompt
            // use img.size if you want to use the size from function calling
            const image_size = img.size //'1024x1024' // img.size
            const image_quality = img.quality
            
            try {

                const dalle_image = await imageCompletion({ 
                    //model: 'dall-e-2', // uncomment this if you want to use dall-e 2 instead of dall-e 3
                    prompt: image_prompt,
                    quality: image_quality,
                    size: image_size
                })

                return {
                    prompt: image_prompt,
                    url: dalle_image.data[0].url
                }

            } catch(error) {

                console.log(error.name, error.message)
                
                return null

            }

        })
    )
    image_result = compact(image_result)
        
    let image_list = await Promise.all(
        Array.from(image_result).map(async (img) => {
            
            const urlObject = new URL(img.url)
            const pathname = urlObject.pathname
            const parts = pathname.split('/')
            const name = parts[parts.length - 1]

            const filename = `tmp-${Date.now()}-${name}`
            let filepath = path.join('public', 'uploads', filename)

            const data_response = await fetch(img.url)

            console.log(img.url)

            try {

                await streamPipeline(data_response.body, fs.createWriteStream(filepath))

                return {
                    url: `/uploads/${filename}`,
                    alt: `${img.prompt}`
                }

            } catch(error) {

                console.log(name, error)

                return null

            }

        })
    )
    image_list = compact(image_list)

    return image_list.length > 0 ? { 
        status: 'image generated',
        message: image_list.length > 1 ? captions.done_here_are_the_images[lang] : captions.done_here_is_the_image[lang], 
        images: image_list 
    } : { error: true, status: 'image creation error', message: 'There is a problem creating your image' }

}

export async function POST(request) {

    const { lang = 0, inquiry, previous, image } = await request.json()

    if (!inquiry || !Array.isArray(previous)) {
        return new Response('Bad request', {
            status: 400,
        })
    }

    let prev_data = trim_array(previous, 20)

    let isImageExist = image && Array.isArray(image) && image.length > 0

    const tools = [
        { type: 'function', function: create_image_dalle },
        { type: 'function', function: get_image_for_analysis },
    ]
    
    let system_prompt = `You are a helpful assistant.\n`
        
    let general_prompt = `When the user wants to know create an image, it means they want to create an image using DALL-E 3 and you will help them to write the prompt for DALL-E.\n` +
        `When creating prompt for image creation, do not make up your own prompt.\n` +
        `Ask the user their own ideas of what image they want to be.\n` +
        `If the description is vague, clarify to the user some elements to make it clearer.` +
        `Confirm to the user the image prompt before calling create_image_dall-e 3.\n` +
        `If possible, give them several variations of possible prompts.\n` +
        `When the user wants to analyse image data from chat history, call get_image_for_analysis function.\n` +
        `Be sure to include all the details when filling the query parameter so that we can analyze the picture accurately based on user query.\n`
    
    let vision_prompt = `You are an expert in analysing images and you will help the user in their inquiries related to the images included.\n`
    
    let today = `Today is ${new Date()}.`

    system_prompt += isImageExist ? vision_prompt : general_prompt
    system_prompt += today

    let messages = [{ role: 'system', content: system_prompt }]
    if(prev_data.length > 0) {
        messages = messages.concat(prev_data)
    }

    if(isImageExist) {

        let user_content = [{ type: 'text', text: inquiry }]

        image.forEach((img) => {
            user_content.push({ type: 'image_url', image_url: { url: img.base64 } })
        })

        messages.push({ role: 'user', content: user_content })

    } else {
        messages.push({ role: 'user', content: inquiry })
    }

    let result = {}

    try {

        let options = { messages }

        if(isImageExist) {
            options.model = 'gpt-4-vision-preview'
        } else {
            options.tools = tools
        }
        
        result = await chatCompletion(options)

        console.log('function call', result)
        
    } catch(error) {

        console.log(error.name, error.message)

    }

    if(result.finish_reason === 'tool_calls') {

        let tool_response = result.message
        let tool_outputs = []
        let tool_images = []

        for(let tool of tool_response.tool_calls) {

            let tool_name = tool.function.name
            let tool_args = JSON.parse(tool.function.arguments)

            console.log(tool_name, tool_args)

            let tool_output_item = { status: 'error', message: 'sorry, function not found' }

            if(tool_name === 'create_image_dall-e') {

                tool_output_item = await useDalle(tool_args)

                if(!tool_output_item.error) {

                    // we are separating the image data
                    // we will not include it when we submit the response back for summary
                    let { images, ...others } = tool_output_item

                    tool_images = images
                    tool_output_item = others

                }

            } else if(tool_name === 'get_image_for_analysis') {

                tool_output_item = await useVision(tool_args, inquiry, prev_data)

            }

            console.log(tool_output_item)

            tool_outputs.push({
                tool_call_id: tool.id, 
                role: 'tool', 
                name: tool_name,
                content: JSON.stringify(tool_output_item, null, 2) 
            })

        }

        messages.push(tool_response)
        for(let output_item of tool_outputs) {
            messages.push(output_item)
        }

        try {

            result = await chatCompletion({
                messages,
                tools
            })

            console.log('summary', result)
            console.log("images", tool_images)

            if(tool_images.length > 0) {
                result.message.image = tool_images
            }

        } catch(error) {
            
            console.log(error.name, error.message)

        }
        
    } else {

        // in case the AI respond with markdown image
        // we will extract the image urls

        let tmp_content = result.message.content.split('\n')

        let tmp_images = tmp_content.filter((tmp) => {
            return tmp.indexOf('![') >= 0
        }).map((tmp) => {
            
            const tmp_data = parse_markdown_image_link(tmp)
            
            return {
                alt: tmp_data[0],
                url: tmp_data[1].split(' ')[0]
            }

        })

        if(tmp_images.length > 0) {
            
            result.message.image = tmp_images

        }

    }

    return new Response(JSON.stringify({
        result: result.message,
    }), {
        status: 200,
    })

}