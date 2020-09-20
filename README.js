// portrait-mod-instagram-mask
//AR effect for Instagram which emulates some of camera features of portrait mod on Apple devices.
//CODE:

const S = require('Shaders');
const T = require('Textures');
const R = require('Reactive');
const M = require('Materials');
const Scene = require('Scene');
const NUI = require('NativeUI');
const FaceTracking = require('FaceTracking');
const Patches = require("Patches");

const Dia = require('Diagnostics');


(async function () {
    const [
        backgroundMaterial,
        personMaterial,
        faceMaterial,
        cameraTexture,
        faceTexture,
        canvas,
        textObject1,
        textObject2,
        textObject3,
        plane1,
        plane2,
        plane3,
        fade,
        faceDetectionPlane,
        mode1,
        mode2,
        mode3,
        isFrontCam,
    ] = await Promise.all([
        M.findFirst('backgroundMaterial'),
        M.findFirst('personMaterial'),
        M.findFirst('faceMaterial'),
        T.findFirst('cameraTexture'),
        T.findFirst('faceTrackerTexture'),
        Scene.root.findFirst('canvas'),
        Scene.root.findFirst('text1'),
        Scene.root.findFirst('text2'),
        Scene.root.findFirst('text3'),
        Scene.root.findFirst('plane1'),
        Scene.root.findFirst('plane2'),
        Scene.root.findFirst('plane3'),
        Scene.root.findFirst('fade'),
        Scene.root.findFirst('faceDetection'),
        T.findFirst('mode1'),
        T.findFirst('mode2'),
        T.findFirst('mode3'),
        Patches.outputs.getBoolean("isFrontCamActive"),
    ]);
    //=========================================================================================================

    //=================================== TEXTURES OPTIONS
    const uv = S.vertexAttribute({ // declaring vertex attribute for texture overlaying
        "variableName": S.VertexAttribute.TEX_COORDS
    });

    const fuv = S.fragmentStage(uv); // uv (Vertex Shader) -> fuv (Fragment Shader)

    const camTex = cameraTexture.signal; // Camera Texture turned into a Signal => because textureSampler() needs texture to be a signal!
    const faceTex = faceTexture.signal; // Face Texture turned into a Signal

    const textureSlot = S.DefaultMaterialTextures.DIFFUSE; // texture slot declaration (for inserting textures to material)
    //=========================================================================================================


    //=================================== TEXTURES OPTIONS
    const backColor = S.textureSampler(camTex, fuv); // background camera texture
    const faceColor = S.textureSampler(faceTex, fuv); // user's face texture

    const blurColorTex = boxBlur(camTex, canvas, fuv, 7); // blured camera texture

    const blackColorTex = R.pack4(0, 0, 0, 1); // black texture color => used for the black background in 2nd camera mode
    const whiteColorTex = R.pack4(1, 1, 1, 1); // white texture color => used for the white background in 3rd camera mode
    //=========================================================================================================


    //=================================== LUMINANCE COLOR 
    const lumBlack = luminance(backColor, 0.2, 0.8); // function that fades given texture with certain parameters
    const lumWhite = luminance(backColor, 0.8, 0.1); // same as ^

    const lumColorBlack = R.pack4(lumBlack, lumBlack, lumBlack, 1); // black-white texture of background for 2nd camera mode
    const lumColorWhite = R.pack4(lumWhite, lumWhite, lumWhite, 1); // b-w texture of background for 3rd camera mode

    const lumBlackF = luminance(faceColor, 0.2, 0.8); // same as lumBlack but for face texture
    const lumWhiteF = luminance(faceColor, 0.8, 0.1); // same as ^

    const lumColorBlackF = R.pack4(lumBlackF, lumBlackF, lumBlackF, 1); // b-w user's face texture for 2nd camera mode
    const lumColorWhiteF = R.pack4(lumWhiteF, lumWhiteF, lumWhiteF, 1); // b-w user's face texture for 3rd camera mode
    //=========================================================================================================


    //=================================== ON LOAD CAMERA EFFECTS SETTINGS
    // settings that are on the load of mask
    backgroundMaterial.setTextureSlot(textureSlot, blurColorTex); // bg texture of the 1st camera mod
    faceMaterial.setTextureSlot(textureSlot, faceColor); // default face texture
    personMaterial.setTextureSlot(textureSlot, backColor); // default texture of segmented person material
    //=========================================================================================================


    //=================================== TEXT SETTINGS
    // font size is depends on device screen width so that it is visible on all devices
    textObject1.fontSize = R.floor(R.div(canvas.width.pinLastValue(), 18)).pinLastValue();
    textObject2.fontSize = R.floor(R.div(canvas.width.pinLastValue(), 18)).pinLastValue();
    textObject3.fontSize = R.floor(R.div(canvas.width.pinLastValue(), 18)).pinLastValue();

    // text of 1st camera mod is visible and others are NOT
    textObject1.hidden = false;
    textObject2.hidden = true;
    textObject3.hidden = true;
    //=========================================================================================================


    //=================================== (under text) PLANE SETTINGS
    // plane under text of 1st camera mod is visible and others are NOT
    plane1.hidden = false;
    plane2.hidden = true;
    plane3.hidden = true;
    //=========================================================================================================


    //=================================== NATIVE UI "CAMERA MODS" SWITCH
    // declaring a picker
    const picker = NUI.picker;

    // configuration of the UI picker
    const configuration = {
        selectedIndex: 0,
        items: [{
                image_texture: mode1
            },
            {
                image_texture: mode2
            },
            {
                image_texture: mode3
            },
        ]
    };

    picker.configure(configuration); // giving picker its configurations 
    picker.visible = true; // making it visible on the screen

    // temp var for switch()
    let blureModeSwitch;

    // watching picker changes
    picker.selectedIndex.monitor().subscribe(function (index) {

        // giving temp variable the last chosen (tap on the image on the screen) item of the UI picker
        blureModeSwitch = configuration.items[index.newValue].image_texture;

        switch (blureModeSwitch) {
            case (configuration.items[0].image_texture):
                // shows text for the 1st camera mod
                textObject1.hidden = false;
                textObject2.hidden = true;
                textObject3.hidden = true;

                // mode configurations
                personMaterial.setTextureSlot(textureSlot, backColor);
                faceMaterial.setTextureSlot(textureSlot, faceColor);
                backgroundMaterial.setTextureSlot(textureSlot, blurColorTex);
                fade.hidden = false;

                // shows plane under text for the 1st camera mod
                plane1.hidden = false;
                plane2.hidden = true;
                plane3.hidden = true;
                break;

            case (configuration.items[1].image_texture):
                // same as 1st case
                textObject1.hidden = true;
                textObject2.hidden = false;
                textObject3.hidden = true;

                personMaterial.setTextureSlot(textureSlot, lumColorBlack);
                faceMaterial.setTextureSlot(textureSlot, lumColorBlackF);
                backgroundMaterial.setTextureSlot(textureSlot, blackColorTex);
                fade.hidden = true;

                plane1.hidden = true;
                plane2.hidden = false;
                plane3.hidden = true;
                break;

            case (configuration.items[2].image_texture):
                // same as 1st case
                textObject1.hidden = true;
                textObject2.hidden = true;
                textObject3.hidden = false;

                personMaterial.setTextureSlot(textureSlot, lumColorWhite);
                faceMaterial.setTextureSlot(textureSlot, lumColorWhiteF);
                backgroundMaterial.setTextureSlot(textureSlot, whiteColorTex);

                plane1.hidden = true;
                plane2.hidden = true;
                plane3.hidden = false;
                break;
        }
    });
    //=========================================================================================================


    //=================================== FACE DETECTION PLANE SETTINGS
    const face = FaceTracking.face(0); // declaring face
    faceDetectionPlane.transform.position = R.pack3(face.cameraTransform.position.x, face.cameraTransform.position.y, 0.02); // give plane 3D position of the face
    //=========================================================================================================

})();


function luminance(color, a, b) {
    // line below equals to :
    //      color[a1,b1,c1,d1];
    //      arr[a2, b2,c2,d2];
    //      return (a1*a2 + b1*b2 + c1*c2 + d1*d2);
    return R.dot(color, R.pack4(a, b, 0, 0));
}


function boxBlur(texture, canvas, uv, steps) {
    // intensity of bluring
    const iter_step = Math.floor(steps / 2.0);
    // screen [width, height]
    const pixelWH = R.pack2(R.div(1.0, canvas.width), R.div(1.0, canvas.height));

    let blendColor = R.pack4(0, 0, 0, 0);
    for (let i = -iter_step; i <= iter_step; i++) {
        for (let j = -iter_step; j <= iter_step; j++) {
            const blurUV = R.add(uv, R.mul(R.pack2(i, j), pixelWH));
            blendColor = R.add(blendColor, S.textureSampler(texture, blurUV));
        }
    }
    const numSamples = 1 / (steps * steps);
    return R.mul(blendColor, R.pack4(numSamples, numSamples, numSamples, 1));
}
