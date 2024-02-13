import React, { useRef } from 'react';

function EventMaintenancePopupCropWindow(props) {

    // Component to:
    // 1. display the input graphic supplied in props.temporaryBackgroundFilename under a draggable and resizable
    //    "crop window".
    // 2. provide a "crop" button that, when clicked, calls the props.returnDataUrl function to return a scaled
    //    copy of the portion of the input graphic framed by the "crop window" to the component's parent.

    const pageContainerRef = useRef(null);
    const baseImageRef = useRef(null);
    const imageContainerRef = useRef(null);
    const scaledBaseImageRef = useRef(null);
    const scaledBaseImageCanvasRef = useRef(null)
    const cropWindowRef = useRef(null);
    const cropWindowResizeBoxRef = useRef(null);
    const scaledCropImageCanvasRef = useRef(null);

    var mouseDownX, mouseDownY, mouseDownLeft, mouseDownTop, mouseDownWidth, mouseDownHeight,
        xChangeLeftPermissibleMax, xChangeRightPermissibleMax, yChangeUpPermissibleMax, yChangeDownPermissibleMax,
        xChangeWidthPermissibleMax, yChangeHeightPermissibleMax,
        xChange, yChange;

    // Sizing for the "imageContainer", the square window within the CropWindow Popup that displays the user
    // supplied graphic is defined relative to the "rem" sizing of the popup itself. It needs to be square
    // because the graphic is of unkniown format - it may be either landscape or portrait and it needs to be
    // as large as possible because, in the current design, the higest user-supplied image is going to be
    // scaled into the pixel dimensions of "imageContainer" and the Cropped graphic snapped out of this. So
    // resolution will be lost if it's too small. Other designs might be possible, (for instance, you might
    // run a "hidden" large-scale canvas" behind the visible "imageContainer" and do your snapping from that),
    // but things are complicated enough as they are!

    const imageContainerWidth = "28rem"; // following through on the use of rem units to define the CropWindow popup 
    const imageContainerHeight = "28rem";
    const imageContainerWidthInPx = parseInt(imageContainerWidth, 10) * 16;
    const imageContainerHeightInPx = parseInt(imageContainerHeight, 10) * 16;

    // The EventCard component is referenced by the EventMaintenancePopup, Home and MobileHome comonents and
    // is sized by these using vw-based dimensions. The first two use 23vw*14vw and the last uses 75vw*46vw.
    // The important thing is that the aspect ration is consistent, otherwise distortion may occur when the
    // thumbnail graphic is applied by EventCard itself. It applies this as a background with "backGroundSize"
    // style set to "cover". This last ensures that width and height are "tugged" and cropped as necessary to
    // make sure that the background covers the <div> completely. 

    // CropWindow is thus designed to deliver a graphic image of 23*14 aspect ratio with a resolution that's
    // adeqate but not excessive (so that performace is not degraded). It does this by arbitraril choosin
    // 23rem as the width and assuming that a rem is 16px

    const eventCardWidth = "23rem";
    const eventCardHeight = "14rem";
    const aspectRatio = parseInt(eventCardWidth, 10) / parseInt(eventCardHeight, 10)
    const eventCardWidthInPx = parseInt(eventCardWidth, 10) * 16
    const eventCardHeightInPx = parseInt(eventCardHeight, 10) * 16

    // to get the cropping window started with a generally suitable width, this is initialised as 250px.
    // Height then naturally follows things by reference to the 23/14 aspectRatio 

    const cropWindowWidth = "250px"
    const cropWindowHeight = parseInt(cropWindowWidth, 10) / aspectRatio + "px";

    var isDragging = false;
    var isResizing = false;

    // The EventMaintenancePopupCropWindow is launched by parent components once the local image file supplied
    // by the user has been successfully uploaded to it temporary location in the Cloud Storage
    // event_backgrounds folder. It then renders a series of <div>s, <img>s and <Canvas>es as defined below.
    // But additionally, because we don't know the dimensions of the usersupplied file until it actually
    // arrives, the code needs to set appropriate widths, heights, tops and lefts for many of these elements.
    // In a classic React implementation this would be achieved by using a useEffect function to "reach into"
    // the Dom and manipulate properties as necessary but in practice this just didn't seem to work reliably.
    // What was wanted was for the useEffect to declare an "onload" function for the baseImage <img> (this
    // being the component that contains all the information we need) but for some reason this didn't work
    // reliably. The solution seemed simply to be to define this onload function as an "onload=" structure on
    // the <img> itself. Here's the structure that this initialises

    // imageContainer        - the outer (bordered) square "holder" for the cropping arrangement
    // baseImage             - within this a hidden <img> rectangle that may overhand imageContainer to
    //                         right or left. The src for this comes from props.temporaryBackgroundFilename
    // scaledBaseImage       - a hidden scaled copy of baseImage sized to fit into imageContainer (but really
    //                         just used to store scaled image height and width values)
    // scaledBaseImageCanvas - a <canvas> copy of baseImage scaled to fit within imageContainer
    // cropWindow            - the draggable, resizable window displayed over scaledBaseImageCanvas
    // scaledCropImageCanvas - a hidden <canvas> containing a copy of the subset of imageContainer defined
    //                         by cropWindow

    function mouseMoveOnImageContainer(e) {
        // console.log("x,y in ImageContainer are " + e.clientX + " and " + e.clientY)
    }

    function mouseDownOnCropWindow(e) {
        //console.log("In mouseDownOnCropWindow") 
        e.stopPropagation();
        // stopPropagation() is used on all component mouse event functions to ensure that they don't bubble
        // up and fire events on its parents
        isDragging = true
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;

        // "left for an element is measured from the left of its border.
        // "width" for an element also does not include its border.

        // All "saved" settings are numbers rather than "px"-suffixed strings required to specify left,
        // height etc in style

        mouseDownLeft = parseInt(cropWindowRef.current.style.left, 10);
        mouseDownTop = parseInt(cropWindowRef.current.style.top, 10);

        xChangeLeftPermissibleMax = -parseInt(cropWindowRef.current.style.left, 10) - 1;
        xChangeRightPermissibleMax = (scaledBaseImageRef.current.width) - (parseInt(cropWindowRef.current.style.left, 10) + parseInt(cropWindowRef.current.style.width, 10))
        yChangeUpPermissibleMax = -parseInt(cropWindowRef.current.style.top, 10) - 1;
        yChangeDownPermissibleMax = (scaledBaseImageRef.current.height + 1) - (parseInt(cropWindowRef.current.style.top, 10) + parseInt(cropWindowRef.current.style.height, 10));

    }

    function dragCropWindow(e) {
        //console.log("In dragCropWindow")
        e.stopPropagation();
        if (isResizing) resizeCropWindow(e);
        if (isDragging) {

            // constrain movement past the image margins

            let xChangeRequest = e.clientX - mouseDownX; // negative value indicates movement left
            let yChangeRequest = e.clientY - mouseDownY; // negative value indicates movement upward

            xChange = (xChangeRequest < 0) ? Math.max(xChangeRequest, xChangeLeftPermissibleMax) : Math.min(xChangeRequest, xChangeRightPermissibleMax)
            yChange = (yChangeRequest < 0) ? Math.max(yChangeRequest, yChangeUpPermissibleMax) : Math.min(yChangeRequest, yChangeDownPermissibleMax)

            // apply the "X/Y changes since MouseDown" 
            cropWindowRef.current.style.left = (mouseDownLeft + xChange) + "px";
            cropWindowRef.current.style.top = (mouseDownTop + yChange) + "px";
        }
    }

    function mouseUpOnCropWindow(e) {
        //console.log("In mouseUpOnCropWindow")
        e.stopPropagation();
        clearWindowSettings();
    }

    function mouseDownOnResizeBox(e) {
        //console.log("In mouseDownOnResizeBox")
        e.stopPropagation();
        isResizing = true
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
        mouseDownLeft = parseInt(cropWindowRef.current.style.left, 10); // all "saved" settings are numbers rather than "px"-suffixed strings
        mouseDownWidth = parseInt(cropWindowRef.current.style.width, 10);
        mouseDownTop = parseInt(cropWindowRef.current.style.top, 10);
        mouseDownHeight = parseInt(cropWindowRef.current.style.height, 10);

        xChangeLeftPermissibleMax = -parseInt(cropWindowRef.current.style.left, 10) - 1;
        xChangeWidthPermissibleMax = parseInt(cropWindowRef.current.style.width, 10);
        yChangeUpPermissibleMax = -parseInt(cropWindowRef.current.style.top, 10) - 1;
        yChangeHeightPermissibleMax = parseInt(cropWindowRef.current.style.height, 10);

    }

    function resizeCropWindow(e) {
        //console.log("In resizeCropWindow where isResizing is " + isResizing)
        e.stopPropagation();
        if (isResizing) {
            let xChangeRequest = e.clientX - mouseDownX // negative change indicates magnification
            let yChangeRequest = xChangeRequest / aspectRatio

            let changePermitted = true;
            if (xChangeRequest < 0 && xChangeRequest < xChangeLeftPermissibleMax) changePermitted = false;
            if (xChangeRequest >= 0 && xChangeRequest > xChangeWidthPermissibleMax) changePermitted = false;
            if (yChangeRequest < 0 && yChangeRequest < yChangeUpPermissibleMax) changePermitted = false;
            if (yChangeRequest >= 0 && yChangeRequest > yChangeHeightPermissibleMax) changePermitted = false;

            // console.log("xChangeRequest = " + xChangeRequest + " " + " yChangeRequest = " + yChangeRequest + " xChangeLeftPermissibleMax =  " + xChangeLeftPermissibleMax + " yChangeUpPermissibleMax =  " + yChangeUpPermissibleMax + " changePermitted =  " + changePermitted)

            if (changePermitted) {
                xChange = (xChangeRequest < 0) ? Math.max(xChangeRequest, xChangeLeftPermissibleMax) : Math.min(xChangeRequest, xChangeWidthPermissibleMax)
                yChange = (yChangeRequest < 0) ? Math.max(yChangeRequest, yChangeUpPermissibleMax) : Math.min(yChangeRequest, yChangeHeightPermissibleMax)

                cropWindowRef.current.style.left = (mouseDownLeft + xChange - 1) + "px";
                cropWindowRef.current.style.width = (mouseDownWidth - xChange) + "px";
                cropWindowRef.current.style.top = (mouseDownTop + yChange) + "px";
                cropWindowRef.current.style.height = (mouseDownHeight - yChange) + "px";
            }

        }
    }

    function mouseUpOnResizeBox(e) {
        //console.log("In mouseUpOnPageContainer")
        clearWindowSettings();
    }

    function mouseMoveOnPageContainer(e) {
        //console.log("In mouseUpOnPageContainer")
        if (isResizing) resizeCropWindow(e)
    }

    function mouseUpOnPageContainer(e) {
        // "on container rather than on ResizeBox because the pointer may wander off the image completely
        console.log("In mouseUpOnImageContainer")
        clearWindowSettings();
    }

    function clearWindowSettings() {
        isDragging = false;
        isResizing = false;
        cropWindowRef.current.style.cursor = "move";
        cropWindowResizeBoxRef.current.style.cursor = "nw-resize";
        imageContainerRef.current.style.cursor = "default";
    }

    function crop() {
        // get the section of the image defined on scaledBaseimageCanvas by the current cropwindow and write
        // it to a new scaledCropImageCanvas scaled at 23rem*14rem.

        // "left for an element excludes its border. "width" for an element also excludes its border.
        const scaledCropImageCanvasCtx = scaledCropImageCanvasRef.current.getContext("2d");
        const sx = parseInt(cropWindowRef.current.style.left, 10) + 1;
        const sy = parseInt(cropWindowRef.current.style.top, 10) + 1;
        const sw = parseInt(cropWindowRef.current.style.width, 10);
        const sh = parseInt(cropWindowRef.current.style.height, 10);

        // see https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage for parameter docs
        scaledCropImageCanvasCtx.drawImage(scaledBaseImageCanvasRef.current, sx, sy, sw, sh, 0, 0, eventCardWidthInPx, eventCardHeightInPx);

        // finally, turn it into a dataimage and get its length. Using chatGpt recommendations for file type
        // and quality to minimise string size while maximising image qualityminisin 
        const dataUrl = scaledCropImageCanvasRef.current.toDataURL('image/jpg', 0.7)

        props.returnDataUrl(dataUrl);
    }


    return (
        <div ref={pageContainerRef} style={{ width: "100%", height: "100%" }}
            onMouseMove={(e) => mouseMoveOnPageContainer(e)}
            onMouseUp={(e) => mouseUpOnPageContainer(e)}>

            <div style={{ display: 'flex', width: '90%', justifyContent: 'center', userSelect: 'none' }}>
                <div style={{ width: "50vh" }}>
                    <p style={{ width: "80%", marginLeft: "auto", marginRight: "auto" }}>
                        Use the "draggable" and "resizable" cropwindow displayed at bottom/right to select the
                        portion of your graphic to be used as the event's "thumnail".  Click the
                        "Crop" button, below, to preview the thumbnail and adjust label colours, as necessary
                    </p>
                    <button type='button' className='selectedapparchbutton'
                        style={{
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}
                        title="Crop"
                        onClick={() => crop()}
                    >Crop</button>
                </div>
                <div ref={imageContainerRef} style={{
                    position: "relative", border: '1px solid black', padding: '2px', marginRight: "auto"
                }}
                    onMouseMove={(e) => mouseMoveOnImageContainer(e)}>
                    <div style={{ position: "relative" }}>
                        <img
                            ref={baseImageRef}
                            src={props.temporaryBackgroundFilename}
                            crossOrigin="anonymous"
                            style={{ display: 'none' }}
                            alt="Hidden unscaled display of the user-supplied graphic "
                            onLoad={function () {
                                console.log("In useEffect onload)")

                                const scaledBaseImageCanvas = scaledBaseImageCanvasRef.current;
                                const ctx = scaledBaseImageCanvas.getContext("2d");

                                // we're going to have to compute the scaling factor necessary to fit the user-supplied graphic
                                // into the imageContainer in an optimal fashion - which dimension is going to determine the
                                // factor - height or width?

                                // set the width and height in the style for the imageContainer, scaledBaseImageCanvas and scaledCropImageCanvas

                                imageContainerRef.current.style.width = imageContainerWidthInPx + "px"
                                imageContainerRef.current.style.height = imageContainerHeightInPx + "px"
                                scaledBaseImageCanvasRef.current.width = imageContainerWidthInPx
                                scaledBaseImageCanvasRef.current.height = imageContainerHeightInPx
                                scaledCropImageCanvasRef.current.width = eventCardWidthInPx
                                scaledCropImageCanvasRef.current.height = eventCardHeightInPx

                                var hRatio = imageContainerWidthInPx / baseImageRef.current.width;// "width" doesn't include "border" or padding
                                var vRatio = imageContainerHeightInPx / baseImageRef.current.height;
                                var ratio = Math.min(hRatio, vRatio);

                                scaledBaseImageRef.current.width = baseImageRef.current.width * ratio;
                                scaledBaseImageRef.current.height = baseImageRef.current.height * ratio;

                                ctx.drawImage(baseImageRef.current, 0, 0, baseImageRef.current.width, baseImageRef.current.height, 0, 0, scaledBaseImageRef.current.width, scaledBaseImageRef.current.height);

                                // set the position of the cropWindow so that it sits at the extreme right/bottom of the baseImage
                                cropWindowRef.current.style.left = ((baseImageRef.current.width * ratio) - parseInt(cropWindowWidth, 10) + 1) + "px" ///leve room for the right border
                                cropWindowRef.current.style.top = ((baseImageRef.current.height * ratio) - parseInt(cropWindowHeight, 10) + 11) + "px" //leave room for the resizeBox and the top border

                            }}
                        />
                        <div
                        >
                            <img ref={scaledBaseImageRef} style={{ display: 'none' }}
                                alt="Hidden scaled display of the user-supplied graphic " />
                            <canvas
                                ref={scaledBaseImageCanvasRef}
                                style={{ position: "absolute", left: 0, top: 0 }}
                            />
                            <div
                                ref={cropWindowRef}
                                style={{
                                    position: "absolute",
                                    width: (cropWindowWidth),
                                    height: (cropWindowHeight),
                                    border: "1px solid white",
                                    cursor: "move",
                                    transformOrigin: "bottom right"
                                }}
                                onMouseDown={(e) => mouseDownOnCropWindow(e)}
                                onMouseMove={(e) => dragCropWindow(e)}
                                onMouseUp={(e) => mouseUpOnCropWindow(e)}
                            >
                                <span
                                    ref={cropWindowResizeBoxRef}
                                    style={{
                                        position: "absolute",
                                        left: "-10px",
                                        top: "-10px",
                                        cursor: "nw-resize",
                                        width: "10px",
                                        height: "10px",
                                        background: 'cyan',
                                        border: '1px solid black'
                                    }}
                                    onMouseDown={(e) => mouseDownOnResizeBox(e)}
                                    onMouseMove={(e) => resizeCropWindow(e)}
                                    onMouseUp={(e) => mouseUpOnResizeBox(e)}
                                >
                                    <span></span>
                                </span>
                            </div>
                        </div>
                        <canvas ref={scaledCropImageCanvasRef} style={{ display: 'none' }}></canvas>
                    </div>
                </div>
            </div>
        </div >
    );
};

export { EventMaintenancePopupCropWindow };
