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

import CustomTheme from '../components/customtheme'
import LoadingText from '../components/loadingtext'
import Loader from '../components/loader'

import useDarkMode from '../lib/usedarkmode'
//import useAppStore from '../stores/appstore'

import { welcome_greeting, getSimpleId } from '../lib/utils'

import classes from './sandbox.module.css'


export default function Sandbox() {

    useDarkMode()

    const classifyRef = React.useRef()
    const fileRef = React.useRef(null)
    const inputRef = React.useRef(null)
    const messageRef = React.useRef(null)

    const timerRef = React.useRef(null)

    const [inputFocus, setInputFocus] = React.useState(false)
    const [previewImage, setPreviewImage] = React.useState([])
    const [previewData, setPreviewData] = React.useState({})
    //const previewImageRef = React.useRef(null)
    
    const [inputText, setInputText] = React.useState('')
    const [messageItems, setMessageItems] = React.useState([])
    const [isProcessing, setProcessing] = React.useState(false)
    const [isLoading, setLoading] = React.useState(false)
    
    React.useEffect(() => {

        welcome_greeting()

        //setLoading(true)
        //loadLibrary()

    }, [])

    const loadLibrary = async () => {

        setLoading(true)
        
        const ml5 = (await import('ml5')).default

        classifyRef.current = ml5.imageClassifier('MobileNet', onModelLoaded)

    }

    const onModelLoaded = () => {

        setLoading(false)

    }

    const handleSubmit = async (e) => {

        console.log("submit query...", (new Date()).toLocaleTimeString())
        
        clearTimeout(timerRef.current)

        e.preventDefault()

        setProcessing(true)

        const images = messageItems.filter(item => item.type === 'image').map(item => {
            return {
                data: {
                    lastModified: item.data.lastModified,
                    name: item.data.name,
                    size: item.data.size,
                    type: item.data.type,
                },
                description: item.description,
            }
        })

        const current_image = images.length > 0 ? images[images.length - 1] : null

        const previous = messageItems.filter(item => item.type === 'text' && item.role !== 'error').map(item => {
            return {
                role: item.role,
                content: item.content
            }
        })

        const groupId = getSimpleId()

        const inquiry = inputText

        /*
        const newUserItem = {
                        id: getSimpleId(),
                        gid: getSimpleId(),
                        role: 'user',
                        type: 'image',
                        data: {
                            lastModified: file.lastModified,
                            name: file.name,
                            size: file.size,
                            type: file.type,
                        },
                        description: results,
                        image: reader.result,
                        datetime: (new Date()).toISOString(),
                    }
        */

        let newUserItem = {
            id: getSimpleId(),
            gid: groupId,
            role: 'user',
            content: inquiry,
            type: 'text',
            datetime: (new Date()).toISOString(),
        }

        if(previewImage.length > 0) {

            newUserItem.image = previewImage
            //newUserItem.data = previewData

            setPreviewImage([])
        }

        setMessageItems((prev) => [...prev, ...[newUserItem]])

        
        setInputText('')
        
        inputRef.current.blur()

        resetScroll()

        const system = `You are a helpful assistant.`

        try {

            const response = await fetch('/api/', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    system,
                    inquiry,
                    previous,
                    image: current_image,
                })
            })

            if(!response.ok) {
                console.log('Oops, an error occurred', response.status)
            }

            const ret = await response.json()

            let text = 'Unexpected error'
            let ret_image = []

            console.log("received response...", (new Date()).toLocaleTimeString())
            console.log(ret)

            if(Object.keys(ret.result).length > 0) {

                text = ret.result.content ? ret.result.content : text

                if(ret.result.image && Array.isArray(ret.result.image) && ret.result.image.length > 0) {

                    ret_image = ret.result.image
    
                    console.log(ret_image)
    
                }
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
                newAssistantItem.image = ret_image
            }
            
            setMessageItems((prev) => [...prev, ...[newAssistantItem]])
            
            //resetScroll()
            //inputRef.current.focus()

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
        console.log("click...", (new Date()).toLocaleTimeString())
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

                //previewImageRef.current.src = image.src
                //setPreviewImage(image.src)
                setPreviewImage((prevImgs) => [...prevImgs, ...[image.src]])
                /*setPreviewData({
                    lastModified: file.lastModified,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                })*/

                setProcessing(false)

                /*classifyRef.current.classify(image, (err, results) => {

                    if(err) {
                      console.log(err)
                    }

                    console.log(results)
              
                    setProcessing(false)
                    
                    const newUserItem = {
                        id: getSimpleId(),
                        gid: getSimpleId(),
                        role: 'user',
                        type: 'image',
                        data: {
                            lastModified: file.lastModified,
                            name: file.name,
                            size: file.size,
                            type: file.type,
                        },
                        description: results,
                        image: reader.result,
                        datetime: (new Date()).toISOString(),
                    }
                    
                    setMessageItems((prev) => [...prev, ...[newUserItem]])
        
                    resetScroll()
                    
                })*/
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

    const handleDeleteImage = (index) => {
        
        setPreviewImage((prev) => prev.filter((a, i) => i !== index))

    }

    const handleReset = () => {

        setMessageItems([])

    }

    const handleBlur = () => {
        console.log("blur...")
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
                                            <OpenAiIcon color='#00D8FF' />
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
                                                item.image.map((img, i) => {
                                                    return (
                                                        <img key={i} className={classes.image} src={img} />
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
                                            item.role !== 'error' &&
                                            <p className={classes.text}>{item.content}</p>
                                        }
                                        {
                                            (item.role === 'assistant' && item.image && Array.isArray(item.image) && item.image.length > 0) &&
                                            <div className={classes.imageList}>
                                            {
                                                item.image.map((img, i) => {
                                                    return (
                                                        <img key={i} className={classes.image} src={img} />
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
                {
                    (!inputFocus && messageItems.length > 0) &&
                    <div className={classes.retry}>
                        <Fab onClick={handleReset} size="medium" color="primary">
                            <RestartIcon />
                        </Fab>
                    </div>
                }
                <div className={`${classes.chat} ${classBorderline}`}>
                    {
                        previewImage.length > 0 &&
                        <div className={classes.previewContainer}>
                            {
                                previewImage.map((img, index) => {
                                    return (
                                        <div className={classes.preview} key={index}>
                                            <img src={img} className={classes.previewImage} />
                                            <div className={classes.previewClose}>
                                                <IconButton 
                                                disabled={isProcessing}
                                                onClick={() => handleDeleteImage(index)}>
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
                            placeholder='Send message'
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
                                        disabled={isProcessing || isLoading}
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