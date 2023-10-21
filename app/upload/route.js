import fs from 'fs'
import path from 'path'

export async function POST(req) {
    
    const form = await req.formData()
    
    const blob = form.get('file')
    const name = form.get('name')

    const upload_dir = 'uploads'

    const buffer = Buffer.from(await blob.arrayBuffer())
    const filename = `tmp${Date.now()}${Math.round(Math.random() * 100000)}_${name}`
    
    let filepath = `${path.join('public', upload_dir, filename)}`

    let error_flag = false

    try {

        fs.writeFileSync(filepath, buffer)

    } catch(error) {

        console.log(error)

        error_flag = true

    }
    
    return new Response(JSON.stringify({
        name,
        url: error_flag ? '' : `/${upload_dir}/${filename}`
    }), {
        status: 200,
    })

}