export const getSimpleId = () => Math.random().toString(26).slice(2);

export const isEven = (n) => {
    return n % 2 == 0;
}

export const trim_array = ( arr, max_length = 20 ) => {

    let new_arr = arr
    
    if(arr.length > max_length) {
        
        let cutoff = Math.ceil(arr.length - max_length)
        cutoff = isEven(cutoff) ? cutoff : cutoff + 1
        
        new_arr = arr.slice(cutoff)

    }

    return new_arr

}

/**
 * Converts the colon to period in Chat summary output
 * @param {String} text 
 * @returns 
 */
export function convertColonToPeriod(text) {
    const regex = /^Done!.*:\n$/
    if (regex.test(text)) {
        return text.replace(':', '.')
    }
    return text
}

export function convertColorToPeriod2(text) {
    return text.replace(':', '.')
}

export function detectText(text) {
    const regex = /^!\[.*\.png\)$/
    if (regex.test(text)) {
        return true
    }

    if(text.indexOf('![') > 0 && text.indexOf('.png)')) {
        return true
    }

    return false
}

export function formatText(text, flag = false) {

    const tmp = text.split('\n')

    let arr = []

    for(let i = 0; i < tmp.length; i++) {

        if(tmp[i].trim().length === 0 && flag) continue

        let txt = tmp[i]

        if(i === 0 && flag) {
            txt = convertColorToPeriod2(txt)
        }

        if(i > 0 && flag) {
            if(detectText(txt)) continue
        }

        arr.push(txt)

    }

    return arr.join('\n')

}


/**
 * Removes falsy values from the array
 * @param {Array} array - Array you wish to process
 * @returns {Array}
 */
export function compact(array) {
    let newArray = [];
    for(let i = 0; i < array.length; i++) {
        if(array[i]) {
            newArray.push(array[i]);
        }
    }
    return newArray;
}

export const welcome_greeting = () => {

    console.log(`%cchatgpt-withimage-sample ${(new Date())}`, 'color: chartreuse')

}