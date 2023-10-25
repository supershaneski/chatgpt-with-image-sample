import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { pipeline } from 'stream'

import { chatCompletion, imageCompletion } from '../../services/openai'
import { trim_array, compact, parse_markdown_image_link, remove_trailing_commas } from '../../lib/utils'

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

    console.log('processing...', (new Date()).toLocaleTimeString())

    /////////////////////////////////////////////////
    // this code block is for temporary image analysis
    const bypassFlag = false
    if(!bypassFlag && image && Array.isArray(image) && image.length > 0) {
    
        console.log("images", image)

        let _system_prompt = `You are a helpful assistant.\n` +
            `If the user wants to know about the image or images, call get_image_info function.\n` +
            `When you receive the result from get_image_info, analyse it and give your best interpretation.\n` +
            `If the result is inconclusive, use the filename as additional context.\n` +
            `Be brief and concise in your analysis.\n` +
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

            console.log('_function_call_', _result)
            
        } catch(error) {

            console.log('_function_call_error_', error.name, error.message)

        }

        if(_result.finish_reason === 'function_call') {

            let _func_result = _result.message

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
        
                console.log('_summary_', _result)
                
            } catch(error) {
        
                console.log('_summary_error_', error.name, error.message)
        
            }

        }

        return new Response(JSON.stringify({
            result: _result.message,
        }), {
            status: 200,
        })

    }
    /////////////////////////////////////////////////

    /////////////////////////////////////////////////
    const forceFlag = false
    if(forceFlag) {

        console.log((new Date()).toLocaleTimeString())

        const chance = 4 // Math.round(10 * Math.random())

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
    /////////////////////////////////////////////////
    
    const functions = [create_image_dalle, get_image_for_analysis]
    
    let system_prompt = `You are a helpful assistant.\n` +
        `When the user wants to know create an image, it means they want to create an image using DALL-E and you will help them to write the prompt for DALL-E.\n` +
        `When creating prompt for image creation, do not make up your own prompt.\n` +
        `Ask the user their own ideas of what image they want to be.\n` +
        `If the description is vague, clarify to the user some elements to make it clearer.` +
        `Confirm to the user the image prompt before calling create_image_dall-e.\n` +
        `If possible, give them several variations of possible prompts.\n` +
        `When the user wants to analyse image data from chat history, call get_image_for_analysis function.\n` +
        `Be brief and concise in your analysis.\n` +
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

        console.log('function call error', error)

    }

    if(result.finish_reason === 'function_call') {

        const func_result = result.message

        if(func_result.function_call.name === 'create_image_dall-e') {
            
            console.log("dall-e", func_result.function_call.arguments)

            const func_args = JSON.parse(func_result.function_call.arguments)

            const image_items = func_args.items

            let image_result = await Promise.all(
                Array.from(image_items).map(async (img) => {

                    const image_prompt = img.prompt
                    const image_size = '256x256' //img.size || '256x256'
                    const image_count = 1 //img.image_count && img.image_count > 0 ? parseInt(img.image_count) : 1
                    
                    try {

                        const dalle_image = await imageCompletion({ 
                            prompt: image_prompt,
                            n: image_count,
                            size: image_size
                        })

                        return {
                            prompt: image_prompt,
                            url: dalle_image.data[0].url // for test
                        }

                    } catch(error) {

                        console.log('dall-e-error', error.name, error.message)
                        
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
            
            let dalle_output = image_list.length > 0 ? { 
                message: image_list.length > 1 ? captions.done_here_are_the_images[lang] : captions.done_here_is_the_image[lang], 
                images: image_list 
            } : { error: 'Problem creating your image' }

            let dalle_result = { role: 'function', name: func_result.function_call.name, content: JSON.stringify(dalle_output, null, 2) }
            
            messages.push(func_result)
            messages.push(dalle_result)

            try {

                result = await chatCompletion({
                    messages,
                    functions
                })
        
                console.log('summary', result)

                result.message.image = image_list
                
            } catch(error) {
        
                console.log('summary-error', error.name, error.message)
        
            }

        } else {

            console.log("OTHER-FUNCTION", func_result)

            const func_args2 = JSON.parse(func_result.function_call.arguments)
            const referenced_images = func_args2.images
            
            referenced_images.forEach((img, index) => {

                const raw_file = path.join('public', img)

                if(fs.existsSync(raw_file)) {
                    console.log(index, img, 'OK')
                }

            })


            let api_result = { role: 'function', name: func_result.function_call.name, content: JSON.stringify({
                images: referenced_images
            }, null, 2) }
            
            console.log("referenced-images", referenced_images)
            console.log("query-topic", func_args2.query)

            // TODO: 
            // This will be a second call for image analysis using gpt-4-vision

            messages.push(func_result)
            messages.push(api_result)

            try {

                result = await chatCompletion({
                    messages,
                    functions
                })
        
                console.log('summary2', result)
    
                //result.message.image = image_list
                
            } catch(error) {
        
                console.log('summary2-error', error.name, error.message)
        
            }

        }

    } else {

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
            
            console.log("reference-images", tmp_images)
            
            result.message.image = tmp_images

        }

    }

    return new Response(JSON.stringify({
        result: result.message,
    }), {
        status: 200,
    })

}