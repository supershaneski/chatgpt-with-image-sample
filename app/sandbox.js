'use client'

import React from 'react'

//import NoSsr from '@mui/base/NoSsr'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
//import LinearProgress from '@mui/material/LinearProgress'

import AccountIcon from '@mui/icons-material/AccountCircle'
import ClearIcon from '@mui/icons-material/Clear'
import SendIcon from '@mui/icons-material/Send'
import ImageIcon from '@mui/icons-material/Image'

//import CloseIcon from '@mui/icons-material/HighlightOff'
import CloseIcon from '@mui/icons-material/Cancel'

import OpenAiIcon from '../components/openailogo'

import CustomTheme from '../components/customtheme'
import LoadingText from '../components/loadingtext'

import useDarkMode from '../lib/usedarkmode'
//import useAppStore from '../stores/appstore'

import { getSimpleId } from '../lib/utils'

import classes from './sandbox.module.css'


export default function Sandbox() {

    useDarkMode()

    const classifyRef = React.useRef()
    const fileRef = React.useRef(null)
    const inputRef = React.useRef(null)
    const messageRef = React.useRef(null)

    const [inputText, setInputText] = React.useState('')
    const [messageItems, setMessageItems] = React.useState([])
    const [isProcessing, setProcessing] = React.useState(false)
    const [isLoaded, setLoaded] = React.useState(false)
    
    React.useEffect(() => {

        loadLibrary()

    }, [])

    const loadLibrary = async () => {
        
        const ml5 = (await import('ml5')).default

        classifyRef.current = ml5.imageClassifier('MobileNet', onModelLoaded)

    }

    const onModelLoaded = () => {

        setLoaded(true)

    }

    const handleSubmit = async (e) => {
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

        const previous = messageItems.filter(item => item.type === 'text').map(item => {
            return {
                role: item.role,
                content: item.content
            }
        })

        const groupId = getSimpleId()

        const inquiry = inputText

        const newUserItem = {
            id: getSimpleId(),
            gid: groupId,
            role: 'user',
            content: inquiry,
            type: 'text',
            datetime: (new Date()).toISOString(),
        }

        setMessageItems((prev) => [...prev, ...[newUserItem]])

        setInputText('')
        
        //inputRef.current.blur()

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

            if(Object.keys(ret.result).length > 0) {

                text = ret.result.content ? ret.result.content : text

            }

            const newAssistantItem = {
                id: getSimpleId(),
                gid: groupId,
                role: 'assistant',
                content: text,
                type: 'text',
                datetime: (new Date()).toISOString(),
            }
            
            setMessageItems((prev) => [...prev, ...[newAssistantItem]])
            
            resetScroll()

            //inputRef.current.focus()

        } catch(error) {
            
            console.log(error)

        }

        setProcessing(false)

    }

    const resetScroll = () => {
        setTimeout(() => {
            messageRef.current.scrollTop = messageRef.current.scrollHeight
        }, 300)
    }

    const handleImage = () => {
        fileRef.current.click()
    }

    const handleFile = (e) => {

        setProcessing(true)

        const file = e.target.files[0]


        const reader = new FileReader()

        reader.onload = function() {
            
            const image = new Image()

            image.onload = function() {

                classifyRef.current.classify(image, (err, results) => {

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
                    
                })


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

    return (
        <div className={classes.container}>
            <div className={classes.main}>
                <div className={classes.header}>
                    <h4 className={classes.title}>{process.env.siteTitle}</h4>
                </div>
                <div ref={messageRef} className={classes.messageList}>
                    {
                        messageItems.map((item) => {
                            if(item.type === 'image') {
                                return (
                                    <div key={item.id} className={classes.messageItem}>
                                        {
                                            item.role === 'assistant' &&
                                            <div className={classes.systemIcon}>
                                                <OpenAiIcon color='#00D8FF' />
                                            </div>
                                        }
                                        <div className={classes.message}>
                                            <img className={classes.image} src={item.image} />
                                            <p className={classes.text}>
                                                <span className={classes.desc}>File: {item.data.name}</span>
                                            </p>
                                            <div className={item.role === 'assistant' ? classes.close2 : classes.close}>
                                                <CustomTheme>
                                                    <IconButton onClick={() => handleDelete(item.gid)}>
                                                        <CloseIcon sx={{fontSize: '1.2rem'}} />
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
                            } else {
                                return (
                                    <div key={item.id} className={classes.messageItem}>
                                        {
                                            item.role === 'assistant' &&
                                            <div className={classes.systemIcon}>
                                                <OpenAiIcon color='#00D8FF' />
                                            </div>
                                        }
                                        <div className={[classes.message, item.role === 'assistant' ? classes.assistant : classes.user].join(' ')}>
                                            <p className={classes.text}>{item.content}</p>
                                            <div className={item.role === 'assistant' ? classes.close2 : classes.close}>
                                                <CustomTheme>
                                                    <IconButton onClick={() => handleDelete(item.gid)}>
                                                        <CloseIcon sx={{fontSize: '1.2rem'}} />
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
                            }
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
                <div className={classes.chat}>
                    <CustomTheme>
                        <Box 
                        component='form'
                        onSubmit={handleSubmit}
                        noValidate>
                            <TextField 
                            placeholder='Write your inquiry'
                            disabled={isProcessing}
                            fullWidth
                            inputRef={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position='start'>
                                        <IconButton 
                                        disabled={!isLoaded}
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
                                            onClick={() => setInputText('')}
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
        </div>
    )
}