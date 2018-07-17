# KCD Customizer
![alt text](https://user-images.githubusercontent.com/13967957/42805925-f81432c8-8961-11e8-973b-812f0e6ae8e6.PNG "App demo")![alt text](https://user-images.githubusercontent.com/13967957/42805913-ed1c0e72-8961-11e8-8dfe-0128c7a720a7.jpg "In-Game Shot")

## Summary
The goal of this program is to allow customization of the main character, Henry, in Kingdom Come Deliverance. Users will be able to look at all avaiable head models in the game, and apply morphs to customize these heads. All modeling and rendering are done with the [three.js](https://threejs.org/) libary.

## Building From Source
* Download source
* Build `kcd_skin_modifer` using the sln file
* Drag the built exe into the bin folder
* `npm install`
* `npm run dist`
* The executable will be created under `dist/win-unpacked`

## Setup
* On start up KCDC will ask you to locate the Data directory. This is the directory that contains all the `.pak` files such as `Characters.pak`
* Deleting the config.json, will reset all settings to default. Settings can also be changed in this file.

## Using KCD Customizer
* Apply the desires morphs using the corresponding sliders
* Click export (this can take some time), the file will be exported to `exported/`
* Drag the kcd_custom folder into your Kingdom Come Deliverance Mod folder
* Start up the game!

## Planned Features
~~completed~~
* ~~Add morph targets to each face, allow true customization (only if CryEngine modeling tools release)~~
* Easily swap and use custom textures for any chosen head
* Swap facial props between character heads

## Known Bugs
* General lack of robustness
* ~~Text bar when selecting directory currently says KCD.exe~~
* Perspective camera creates too much distortion, will be changing to orthographic