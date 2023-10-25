/**
 * Generates simple random Id
 * @returns {String}
 */
export const getSimpleId = () => Math.random().toString(26).slice(2)

/**
 * Checks if number is even
 * @param {Integer} n 
 * @returns 
 */
export const isEven = (n) => n % 2 == 0

/**
 * Trims array to desired length
 * @param {Array} arr - Array to trim 
 * @param {Integer} max_length 
 * @returns {Array}
 */
export function trim_array( arr, max_length = 20 ) {

    let new_arr = arr
    
    if(arr.length > max_length) {
        
        let cutoff = Math.ceil(arr.length - max_length)
        cutoff = isEven(cutoff) ? cutoff : cutoff + 1
        
        new_arr = arr.slice(cutoff)

    }

    return new_arr

}

/**
 * Checks if text has Markdown image data
 * @param {String} text 
 * @returns 
 */
function isMarkdownImage(text) {
    
    /* /^!\[.*\.(png|jpg|jpeg|gif)\)$/ */
    const regex = /\[.*\.(png|jpg|jpeg|gif)\)/ 
    
    if (regex.test(text)) return true

    if(text.indexOf('![') >= 0) return true

    return false

}

/**
 * Only formats text if it contains image data
 * @param {String} text - message from chat
 * @returns {String}
 */
export function formatTextQuickDirty(text) {

    const isImageExist = isMarkdownImage(text)

    if(!isImageExist) return text

    let lines = text.split('\n')
    
    let out = []

    for(let i = 0; i < lines.length; i++) {

        if(lines[i].trim().length === 0) continue

        let str = lines[i].trim()

        if(i === 0) str = str.replace(':', '.')

        if(isMarkdownImage(str)) continue

        out.push(str)

    }

    return out.join('\n')

}

/**
 * Extract image data from Markdown image code
 * @param {String} text - Markdown text
 * @returns {Array} - [alt, url]
 */
export function parse_markdown_image_link(text) {
    
    const regex = /!\[(.*?)\]\((.*?)\)/g
  
    const match = regex.exec(text)
  
    if (!match) return []
  
    return [match[1], match[2]]
}

/**
 * Removes falsy values from the array
 * @param {Array} array - Array you wish to process
 * @returns {Array}
 */
export function compact(array) {

    let newArray = []

    for(let i = 0; i < array.length; i++) {
        if(array[i]) {
            newArray.push(array[i])
        }
    }

    return newArray
}

/**
 * Prints welcome text in console
 */
export function welcome_greeting() {

    console.log(`%cchatgpt-withimage-sample ${(new Date())}`, 'color: chartreuse')

}

export function remove_trailing_commas(str) {
    let regex = /\,(?=\s*?[\}\]])/g;
    return str.replace(regex, '');
}