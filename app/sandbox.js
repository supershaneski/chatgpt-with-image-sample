'use client'

import React from 'react'

import { createPortal } from 'react-dom'

//import NoSsr from '@mui/base/NoSsr'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Fab from '@mui/material/Fab'
//import LinearProgress from '@mui/material/LinearProgress'

import RestartIcon from '@mui/icons-material/RestartAlt'
import AccountIcon from '@mui/icons-material/AccountCircle'
import ClearIcon from '@mui/icons-material/Clear'
import SendIcon from '@mui/icons-material/Send'
import ImageIcon from '@mui/icons-material/Image'

//import CloseIcon from '@mui/icons-material/HighlightOff'
import CloseIcon from '@mui/icons-material/Cancel'
import SettingsIcon from '@mui/icons-material/Settings'
import OpenAiIcon from '../components/openailogo'

import Markdown from 'react-markdown'

import CustomTheme from '../components/customtheme'
import LoadingText from '../components/loadingtext'
import Loader from '../components/loader'

import useDarkMode from '../lib/usedarkmode'
import useCaption from '../lib/usecaption'
import captions from '../assets/captions.json'
//import useAppStore from '../stores/appstore'

import { welcome_greeting, getSimpleId, compact, formatText } from '../lib/utils'

import classes from './sandbox.module.css'


export default function Sandbox() {

    useDarkMode()

    const [lang, setCaption] = useCaption(captions)

    const classifyRef = React.useRef()
    const fileRef = React.useRef(null)
    const inputRef = React.useRef(null)
    const messageRef = React.useRef(null)

    const timerRef = React.useRef(null)

    const [inputFocus, setInputFocus] = React.useState(false)
    const [previewImage, setPreviewImage] = React.useState([])
    //const [previewData, setPreviewData] = React.useState([])
    
    const [inputText, setInputText] = React.useState('')
    const [messageItems, setMessageItems] = React.useState([])
    const [isProcessing, setProcessing] = React.useState(false)
    const [isLoading, setLoading] = React.useState(false)
    
    React.useEffect(() => {

        welcome_greeting()

        loadLibrary()

    }, [])

    const loadLibrary = async () => {

        setLoading(true)
        
        const ml5 = (await import('ml5')).default

        classifyRef.current = ml5.imageClassifier('MobileNet', onModelLoaded)

    }

    const onModelLoaded = () => {

        console.log('model loaded...')

        setLoading(false)

    }

    const handleSubmit = async (e) => {

        console.log("submit query...", (new Date()).toLocaleTimeString())
        
        clearTimeout(timerRef.current)

        e.preventDefault()

        setProcessing(true)

        const previous = messageItems.filter(item => item.type === 'text' && item.role !== 'error').map(item => {
            return {
                role: item.role,
                content: item.content
            }
        })

        const groupId = getSimpleId()

        const inquiry = inputText

        let newUserItem = {
            id: getSimpleId(),
            gid: groupId,
            role: 'user',
            content: inquiry,
            type: 'text',
            //image: [],
            datetime: (new Date()).toISOString(),
        }

        if(previewImage.length > 0) {

            let uploaded_files = await Promise.all(
                Array.from(previewImage).map(async (image) => {

                    const formData = new FormData()
                    formData.append('file', image.file)
                    formData.append('name', image.file.name)

                    try {

                        const response_upload = await fetch('/upload/', {
                            method: 'POST',
                            headers: {
                                //'Content-Type': 'multipart/form-data',
                                'Accept': 'application/json',
                            },
                            body: formData,
                            //signal: abortControllerRef.current.signal,
                        })

                        if(!response_upload.ok) {
                            console.log("Oops, an error occurred.", response_upload.status)
                        }

                        const result_upload = await response_upload.json()

                        const _name = result_upload.name
                        const _url = result_upload.url

                        return {
                            id: image.id,
                            name: _name,
                            _name: image.file.name,
                            src: _url,
                            url: _url,
                            _url: URL.createObjectURL(image.file),
                            type: image.file.type,
                            size: image.file.size,
                        }

                    } catch(error) {
                        
                        return null

                    }

                })
            )
            uploaded_files = compact(uploaded_files)

            //console.log("uploaded", uploaded_files)

            ////////////////////////////
            let processed_images = await Promise.all(
                Array.from(previewImage).map(async (image) => {

                    let image_result = null
                    
                    await classifyRef.current.classify(image._image, (error, results) => {

                        if(error) {
                          console.log(error.name, error.message)
                          return
                        }

                        //console.log(results)
                        
                        image_result = results

                    })

                    return {
                        ...image,
                        result: image_result
                    }
                    
                })
            )
            //console.log("[ML5]", processed_images)

            uploaded_files = uploaded_files.map((file) => {
                const proc_sel_image = processed_images.find((img) => img.id === file.id)
                return {
                    ...file,
                    result: proc_sel_image ? proc_sel_image.result : null
                }
            })

            const image_markdown = uploaded_files.map((img) => {
                return `![${img.name}](${img.url} "${img.id}")\n`
            })
            ////////////////////////////

            //console.log("uploaded-images", uploaded_files)

            newUserItem.image = uploaded_files
            newUserItem.content = image_markdown + '\n\n' + newUserItem.content

            console.log("user-entry", newUserItem)

            setPreviewImage([])

        }

        //console.log("new-user-item-image", newUserItem.image, (new Date()).toLocaleTimeString())

        setMessageItems((prev) => [...prev, ...[newUserItem]])

        setInputText('')
        
        inputRef.current.blur()

        resetScroll()

        try {

            const response = await fetch('/api/', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lang,
                    inquiry,
                    previous,
                    image: newUserItem.image && Array.isArray(newUserItem.image) && newUserItem.image.length > 0 ? newUserItem.image : [],
                })
            })

            if(!response.ok) {
                console.log('Oops, an error occurred', response.status)
            }

            const ret = await response.json()

            

            console.log("received response...", (new Date()).toLocaleTimeString())
            console.log(ret)

            let text = ret.result.content || setCaption('unexpected_error')
            let ret_image = []

            if(ret.result.image && Array.isArray(ret.result.image) && ret.result.image.length > 0) {

                ret_image = ret.result.image

            }
            

            let newAssistantItem = {
                id: getSimpleId(),
                gid: groupId,
                role: 'assistant',
                content: text,
                type: 'text',
                datetime: (new Date()).toISOString(),
            }

            if(ret_image.length > 0) {
                newAssistantItem.image = ret_image.map((img) => ({
                    id: getSimpleId(),
                    src: img.url,
                    alt: img.alt,
                }))
            }
            
            setMessageItems((prev) => [...prev, ...[newAssistantItem]])
            
        } catch(error) {
            
            console.log(error)

            let newErrorItem = {
                id: getSimpleId(),
                gid: groupId,
                role: 'error',
                content: error.message,
                type: 'text',
                datetime: (new Date()).toISOString(),
            }

            setMessageItems((prev) => [...prev, ...[newErrorItem]])
            
        } finally {

            resetScroll(true)

            setProcessing(false)

        }

    }

    const resetScroll = (flag = false) => {
        const flagRefocus = flag
        setTimeout(() => {
            messageRef.current.scrollTop = messageRef.current.scrollHeight
            if(flagRefocus) {
                inputRef.current.focus()
            }
        }, 300)
    }

    const handleImage = () => {
        clearTimeout(timerRef.current)
        fileRef.current.click()
    }

    const handleFile = (e) => {

        if(e.target.files.length === 0) return

        setProcessing(true)

        const file = e.target.files[0]


        const reader = new FileReader()

        reader.onload = function() {
            
            const image = new Image()

            image.onload = function() {

                //setPreviewImage((prevImgs) => [...prevImgs, ...[image.src]])

                const newImage = {
                    id: Date.now(),
                    src: image.src,
                    file: file,
                    _image: image,
                }

                setPreviewImage((prevImgs) => [...prevImgs, ...[newImage]])

                /*setPreviewData({
                    lastModified: file.lastModified,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                })*/

                setProcessing(false)

            }

            image.onerror = function(error) {
                console.log('error', error)
                setProcessing(false)
            }

            image.src = reader.result

        }

        reader.readAsDataURL(file)

    }

    const handleDelete = (gid) => {
        
        setMessageItems((prev) => prev.filter((item) => item.gid !== gid))

    }

    const handleDeleteImage = (id) => {
        
        setPreviewImage((prev) => prev.filter((img) => img.id !== id))

    }

    const handleReset = () => {

        setMessageItems([])

    }

    const handleBlur = () => {
        
        timerRef.current = setTimeout(() => {
            setInputFocus(false)
        }, 200)

    }

    const handleClear = () => {
        clearTimeout(timerRef.current)
        setInputText('')
    }

    const classBorderline = inputFocus ? classes.selected : classes.default

    return (
        <div className={classes.container}>
            <div className={classes.main}>
                <div className={classes.header}>
                    <h4 className={classes.title}>{process.env.siteTitle}</h4>
                </div>
                <div ref={messageRef} className={classes.messageList}>
                    {
                        messageItems.map((item) => {
                            return (
                                <div key={item.id} className={classes.messageItem}>
                                    {
                                        item.role === 'assistant' &&
                                        <div className={classes.systemIcon}>
                                            <OpenAiIcon color='#1da5fb' />
                                        </div>
                                    }
                                    {
                                        item.role === 'error' &&
                                        <div className={classes.systemIcon}>
                                            <SettingsIcon />
                                        </div>
                                    }
                                    <div className={[classes.message, item.role === 'assistant' ? classes.assistant : item.role === 'error' ? classes.system : classes.user].join(' ')}>
                                        {
                                            (item.role === 'user' && item.image && Array.isArray(item.image) && item.image.length > 0) &&
                                            <div className={classes.imageList}>
                                            {
                                                item.image.map((img) => {
                                                    return (
                                                        <a className={classes.link} key={img.id} href={`${img.src}`} target="_blank">
                                                            <img className={classes.image} src={img.src} />
                                                        </a>
                                                    )
                                                })
                                            }
                                            </div>
                                        }
                                        {
                                            item.role === 'error' &&
                                            <p className={`${classes.text} ${classes.error}`}>{item.content}</p>
                                        }
                                        {
                                            item.role === 'errors' &&
                                            <div className={classes.mark}>
                                                <Markdown>{item.content}</Markdown>
                                            </div>
                                        }
                                        {
                                            item.role !== 'error' &&
                                            <p className={classes.text}>{ formatText(item.content, item.image && Array.isArray(item.image) && item.image.length > 0) }</p>
                                        }
                                        {
                                            (item.role === 'assistant' && item.image && Array.isArray(item.image) && item.image.length > 0) &&
                                            <div className={classes.imageList}>
                                            {
                                                item.image.map((img) => {
                                                    return (
                                                        <a className={classes.link} key={img.id} href={`${img.src}`} target="_blank">
                                                            <img key={img.src} className={classes.image} src={img.src} alt={img.alt} />
                                                        </a>
                                                    )
                                                })
                                            }
                                            </div>
                                        }
                                        <div className={item.role !== 'user' ? classes.close2 : classes.close}>
                                            <CustomTheme>
                                                <IconButton disabled={isProcessing} onClick={() => handleDelete(item.gid)}>
                                                    <CloseIcon className={classes.closeIcon} sx={{fontSize: '1.2rem'}} />
                                                </IconButton>
                                            </CustomTheme>
                                        </div>
                                    </div>
                                    {
                                        item.role === 'user' &&
                                        <div className={classes.userIcon}>
                                            <CustomTheme>
                                                <AccountIcon />
                                            </CustomTheme>
                                        </div>
                                    }
                                </div>
                            )
                        })
                    }
                    {
                        isProcessing &&
                        <div className={classes.loading}>
                            <LoadingText />
                        </div>
                    }
                </div>
            </div>
            <div className={classes.input}>
                
                    <div className={classes.retry} style={{
                        width: !inputFocus && messageItems.length > 0 ? '48px' : '0px',
                        marginLeft: !inputFocus && messageItems.length > 0 ? '1rem' : '0px'
                    }}>
                        {
                        !inputFocus && messageItems.length > 0 &&
                            <div className={classes.roundButton}>
                                <IconButton size="large" onClick={handleReset}>
                                    <RestartIcon sx={{color: '#fff'}} fontSize="inherit" />
                                </IconButton>
                            </div>
                        }
                    </div>
                
                <div className={`${classes.chat} ${classBorderline}`}>
                    {
                        previewImage.length > 0 &&
                        <div className={classes.previewContainer}>
                            {
                                previewImage.map((img) => {
                                    return (
                                        <div className={classes.preview} key={img.id}>
                                            <img src={img.src} className={classes.previewImage} />
                                            <div className={classes.previewClose}>
                                                <IconButton 
                                                disabled={isProcessing}
                                                onClick={() => handleDeleteImage(img.id)}>
                                                    <ClearIcon className={classes.deleteIcon} />
                                                </IconButton>
                                            </div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    }
                    <CustomTheme>
                        <Box 
                        component='form'
                        onSubmit={handleSubmit}
                        noValidate>
                            <TextField 
                            sx={{ "& fieldset": { border: 'none' } }}
                            placeholder={setCaption(messageItems.length > 1 ? 'send_reply' : 'send_message')}
                            disabled={isProcessing}
                            fullWidth
                            inputRef={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onFocus={(() => setInputFocus(true))}
                            onBlur={handleBlur}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <IconButton 
                                        disabled={isProcessing || previewImage.length >= process.env.maxFileUploadCount}
                                        onClick={handleImage}>
                                            <ImageIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position='end'>
                                        <React.Fragment>
                                            <IconButton
                                            disabled={isProcessing || inputText.length === 0}
                                            onClick={handleClear}
                                            >
                                                <ClearIcon />
                                            </IconButton>
                                            <IconButton
                                            disabled={isProcessing || inputText.length === 0}
                                            onClick={handleSubmit}
                                            >
                                                <SendIcon />
                                            </IconButton>
                                        </React.Fragment>
                                    </InputAdornment>
                                ),
                            }}
                            />
                        </Box>
                    </CustomTheme>
                    <input onChange={handleFile} accept='image/*' ref={fileRef} className={classes.file} type='file' />
                </div>
            </div>
            {
                isLoading && createPortal(
                    <Loader />,
                    document.body
                )
            }
        </div>
    )
}