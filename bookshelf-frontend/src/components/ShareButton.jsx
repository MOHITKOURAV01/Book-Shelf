import React, {
    useState,
    useRef,
    useCallback,
    forwardRef
} from "react";

import "./ShareButton.css";

const ShareButton = forwardRef(({

    url = window.location.href,

    title = document.title,

    text = "Check this out!",

    disabled = false,

    loading = false,

    variant = "primary",

    size = "md",

    rounded = false,

    fullWidth = false,

    iconOnly = false,

    tooltip = "",

    leftIcon = "🔗",

    rightIcon = null,

    className = "",

    beforeShare = () => {},

    afterShare = () => {},

    onSuccess = () => {},

    onError = () => {},

    onShare = () => {},

    ...props

}, ref) => {

    const [status, setStatus] = useState("idle");

    const [ripples, setRipples] = useState([]);

    const timeoutRef = useRef(null);

    const resetStatus = () => {

        clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {

            setStatus("idle");

        },2000);

    };

    const createRipple = useCallback((event)=>{

        const rect = event.currentTarget.getBoundingClientRect();

        const size = Math.max(rect.width,rect.height);

        const ripple = {

            id:Date.now(),

            x:event.clientX - rect.left - size/2,

            y:event.clientY - rect.top - size/2,

            size

        };

        setRipples(prev=>[...prev,ripple]);

        setTimeout(()=>{

            setRipples(prev=>prev.filter(r=>r.id!==ripple.id));

        },600);

    },[]);

    const handleShare = useCallback(async(event)=>{

        if(disabled || loading) return;

        createRipple(event);

        beforeShare();

        setStatus("loading");

        try{

            if(navigator.share){

                await navigator.share({

                    title,

                    text,

                    url

                });

            }

            else{

                await navigator.clipboard.writeText(url);

            }

            setStatus("success");

            onSuccess(url);

            onShare(url);

        }

        catch(error){

            console.error(error);

            setStatus("error");

            onError(error);

        }

        finally{

            afterShare();

            resetStatus();

        }

    },[
        disabled,
        loading,
        url,
        title,
        text,
        createRipple,
        beforeShare,
        afterShare,
        onSuccess,
        onError,
        onShare
    ]);

    const buttonClasses = [

        "share-btn",

        `share-btn--${variant}`,

        `share-btn--${size}`,

        rounded && "share-btn--rounded",

        fullWidth && "share-btn--full",

        disabled && "share-btn--disabled",

        loading && "share-btn--loading",

        className

    ].filter(Boolean).join(" ");

    return(

        <button

            ref={ref}

            className={buttonClasses}

            disabled={disabled || loading}

            title={tooltip}

            onClick={handleShare}

            aria-label="Share"

            aria-busy={loading}

            {...props}

        >

            {status==="loading" ? (

                <span className="share-btn__spinner"/>

            ):(

                <>

                    <span className="share-btn__icon">

                        {leftIcon}

                    </span>

                    {!iconOnly && (

                        <span className="share-btn__text">

                            {

                                status==="success"

                                ? "Copied!"

                                : status==="error"

                                ? "Failed"

                                : "Share"

                            }

                        </span>

                    )}

                    {

                        rightIcon && (

                            <span className="share-btn__icon">

                                {rightIcon}

                            </span>

                        )

                    }

                </>

            )}

            {

                ripples.map(ripple=>(

                    <span

                        key={ripple.id}

                        className="share-btn__ripple"

                        style={{

                            left:ripple.x,

                            top:ripple.y,

                            width:ripple.size,

                            height:ripple.size

                        }}

                    />

                ))

            }

        </button>

    );

});

ShareButton.displayName="ShareButton";

export default ShareButton;