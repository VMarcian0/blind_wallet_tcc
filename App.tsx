import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Camera, PermissionStatus } from 'expo-camera';
import * as tf from "@tensorflow/tfjs";
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import { Platform } from 'react-native';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {loadGraphModel} from '@tensorflow/tfjs-converter';

const TensorCamera = cameraWithTensors(Camera);
// Definitons of textureDims
const textureDims = Platform.OS === 'ios' ?
{
  height: 1920,
  width: 1080,
} :
{
  height: 1200,
  width: 1600,
};

const initialiseTensorflow = async () => {
  tf.env().set('WEBGL_PACK_DEPTHWISECONV', false);
  await tf.ready();
  tf.getBackend();
}

const loadModel = async (model:tf.GraphModel | undefined) => {
  const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/f01oyHcWN/model.json';
  try{
    model = await loadGraphModel(MODEL_URL);
    
    return model;
  }
  catch(error:any){
    console.error('AQUI FDP',error);
  }
}

export default function App() {
  const [hasPermission, setHasPermission] = useState(null || false);
  const [type, setType] = useState(Camera.Constants.Type.back);
  //const [net, setNet] = useState<mobilenet.MobileNet>();
  const [model, setModel] = useState<tf.GraphModel>();
  
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === PermissionStatus.GRANTED);
     
      // initialise Tensorflow
      await initialiseTensorflow();
      // load the model
      // setNet(await mobilenet.load());
      setModel(await loadModel(model));
    })();
  }, []);
  
  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  if(!model){
    return <Text>Model not loaded</Text>;
  }
  
/*   if(!net){
    return <Text>Model not loaded</Text>;
  }
 */
  let frame = 0;
  const computeRecognitionEveryNFrames = 60;
  const handleCameraStream =(images:IterableIterator<tf.Tensor3D>) => {
    const loop = async () => {
      if(model) {
        if(frame % computeRecognitionEveryNFrames === 0){
          const nextImageTensor = images.next().value;
          if(nextImageTensor) {
            //! Classificação acontece aqui
            //const objects = await net.classify(nextImageTensor);
            const result = model.predict(nextImageTensor) as tf.NamedTensorMap;
            console.log(result);
            tf.dispose([nextImageTensor]);
          }
        }
      }
      frame += 1;
      requestAnimationFrame(loop);
    }
    loop();
  }

  return (
    <View style={styles.container}>
      <TensorCamera  
        style={styles.camera}
        type={type}
        onReady={handleCameraStream}
        resizeHeight={200}
        resizeWidth={152}
        resizeDepth={3}
        autorender={true}
        useCustomShadersToResize={false}
        flashMode={'off'}
        cameraTextureHeight={textureDims.height}
        cameraTextureWidth={textureDims.width}   
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setType(
                type === Camera.Constants.Type.back
                  ? Camera.Constants.Type.front
                  : Camera.Constants.Type.back
              );
            }}>
            <Text style={styles.text}> Flip </Text>
          </TouchableOpacity>
        </View>
      </TensorCamera >
    </View>
  );

}


const styles = StyleSheet.create({
  text:{
    flex:1
  },
  button:{
    flex: 1
  },
  buttonContainer: {
    flex: 1
  },
  container: {
    flex: 1,
  },
  camera:{
    flex: 1,
  },
});
