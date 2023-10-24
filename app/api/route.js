import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { pipeline } from 'stream'

import { chatCompletion, imageCompletion } from '../../services/openai'
import { trim_array, compact } from '../../lib/utils'

import create_image_dalle from '../../assets/create_image_dall-e.json'
import get_image_for_analysis from '../../assets/get_image_for_analysis.json'
import get_image_info from '../../assets/get_image_info.json'

import captions from '../../assets/captions.json'

const streamPipeline = promisify(pipeline)

export async function POST(request) {

    const { lang = 0, inquiry, previous, image } = await request.json()

    if (!inquiry || !Array.isArray(previous)) {
        return new Response('Bad request', {
            status: 400,
        })
    }

    let prev_data = trim_array(previous, 20)

    const today = new Date()

    /////////////////////////////////////////////////
    // this code block is for temporary image analysis
    if(image && Array.isArray(image) && image.length > 0) {
    
        console.log("images", image)

        let _system_prompt = `You are a helpful assistant.\n` +
            `If the user wants to know about the image or images, call get_image_info function.\n` +
            `When you receive the result from get_image_info, analyse it and give your best interpretation.\n` +
            `If the result is inconclusive, use the filename as additional context.\n` +
            `Today is ${today}`
        
        let _messages = [{ role: 'system', content: _system_prompt }]
        if(prev_data.length > 0) {
            _messages = _messages.concat(prev_data)
        }
        _messages.push({ role: 'user', content: inquiry })

        let _result = {}

        try {

            _result = await chatCompletion({
                messages: _messages,
                functions: [ get_image_info ],
            })

            console.log('_function_call', _result)
            
        } catch(error) {

            console.log('_function_call-error', error.name, error.message)

        }

        if(_result.content === null || _result.function_call) {

            let _func_result = _result

            let api_output = []
            if(image && Array.isArray(image) && image.length > 0) {

                image.forEach((img) => {

                    const _img_filename = path.join('public', img.url)
                    if(fs.existsSync(_img_filename)) {
                        console.log(img.url)
                    }

                })

                api_output = image.map((img) => ({
                    name: img.name,
                    result: img.result
                }))
        
            }

            let _api_out = { role: 'function', name: 'get_image_info' }
            _api_out.content = JSON.stringify(api_output.length > 0 ? { items: api_output } : { error: 'No images found' }, null, 2)

            _messages.push(_func_result)
            _messages.push(_api_out)

            try {

                _result = await chatCompletion({
                    messages: _messages,
                    functions: [ get_image_info ],
                })
        
                console.log('_summary', _result)
                
            } catch(error) {
        
                console.log('_summary-error', error.name, error.message)
        
            }

        }

        return new Response(JSON.stringify({
            result: _result,
        }), {
            status: 200,
        })

    }
    /////////////////////////////////////////////////

    const forceFlag = false
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

    /*
    const testFlag = false
    if(testFlag) {

        const upload_dir = 'uploads'

        const download_files = ['juutaku-madori.jpg', 'juutaku-madori.pdf']

        let downloaded_files = await Promise.all(
            Array.from(download_files).map(async (file) => {

                let filename = `tmp-${Date.now()}-${file}`
                let filepath = path.join('public', upload_dir, filename)

                const data_response = await fetch(`http://192.168.1.41/simulator/${file}`)

                try {

                    await streamPipeline(data_response.body, fs.createWriteStream(filepath))

                    return { file, url: `/${upload_dir}/${filename}` }

                } catch(error) {

                    console.log(file, error)

                    return null

                }

            })
        )

        console.log(downloaded_files)

    }
    */

    const functions = [create_image_dalle, get_image_for_analysis]
    
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
            //const image_size = func_args.size || '256x256'
            const image_count = func_args.image_count && func_args.image_count > 0 ? parseInt(func_args.image_count) : 1
            const waiting_message = image_count > 1 ? captions.done_here_are_the_images[lang] : captions.done_here_is_the_image[lang]

            let image_list = []

            try {

                const image = await imageCompletion({ 
                    prompt: image_prompt,
                    n: image_count,
                    size: '256x256'
                })
    
                console.log(image.data)

                image_list = await Promise.all(
                    Array.from(image.data).map(async (img, index) => {
                        
                        const urlObject = new URL(img.url)
                        const pathname = urlObject.pathname
                        const parts = pathname.split('/')
                        const name = parts[parts.length - 1]

                        const filename = `tmp-${Date.now()}-${name}`
                        let filepath = path.join('public', 'uploads', filename)

                        const data_response = await fetch(img.url)

                        try {

                            await streamPipeline(data_response.body, fs.createWriteStream(filepath))

                            return { 
                                //file: img.url, 
                                //name,
                                //filename,
                                _url: `http://192.168.1.80:4000/uploads/${filename}`,
                                url: `/uploads/${filename}`,
                                alt: `${(index + 1)}. ${image_prompt}`
                            }

                        } catch(error) {

                            console.log(name, error)

                            return null

                        }
        
                    })
                )

                image_list = compact(image_list)

                /*
                image.data.forEach(async (img) => {

                    const urlObject = new URL(img.url)
                    const pathname = urlObject.pathname
                    const parts = pathname.split('/')
                    const name = parts[parts.length - 1]

                    const filename = `tmp-${Date.now()}-${name}`
                    let filepath = path.join('public', 'uploads', filename)

                    const data_response = await fetch(img.url)

                    try {

                        await streamPipeline(data_response.body, fs.createWriteStream(filepath))

                        //return { file, url: `/${upload_dir}/${filename}` }

                    } catch(error) {

                        console.log(name, error)

                        //return null

                    }

                })

                image_list = image.data.map((img) => img.url)
                */

            } catch(error) {
                console.log("dall-e error", error.name, error.message)
            }

            let dalle_output = image_list.length > 0 ? { message: waiting_message, images: image_list } : { error: 'Problem creating your image' }

            let dalle_result = { role: 'function', name: func_result.function_call.name, content: JSON.stringify(dalle_output, null, 2) }
            
            messages.push(func_result)
            messages.push(dalle_result)

            try {

                result = await chatCompletion({
                    messages,
                    functions
                })
        
                console.log('summary', result)

                result.image = image_list
                
            } catch(error) {
        
                console.log('summary-error', error.name, error.message)
        
            }

            /*
            return new Response(JSON.stringify({
                result: { 
                    role: 'assistant', 
                    content: waiting_message,
                    image: image_list
                },
            }), {
                status: 200,
            })
            */

        } else {

            console.log("other-function")

            console.log("OTHERS", func_result)

            // Here is a call for gpt-4-vision

        }

    }

    return new Response(JSON.stringify({
        result,
    }), {
        status: 200,
    })

}