# KCD Customizer
![alt text](https://user-images.githubusercontent.com/13967957/42026489-1caf3334-7a7c-11e8-9581-4a16990c58d0.png "App demo")![alt text](https://user-images.githubusercontent.com/13967957/42026773-e4366f3a-7a7c-11e8-8299-ab5063b2dc0d.jpg "In-Game Shot")

## Summary
The goal of this program is to allow customization of the main character, Henry, in Kingdom Come Deliverance. Users will be able to look at all avaiable head models in the game, mix and match head props and textures, and export them to the game to be used. All modeling and rendering are done with the [three.js](https://threejs.org/) libary.

## Building From Source
* Download source
* Download **assets.zip** from the Releases tab
	* contains converted models and base material files
* Extract the contents to the extracted source folder
	* **models** and the **materials** folder should be in the same directory as js and semantic-ui
* Open Command Prompt and `cd` into the created directory:
	 ```
	 npm install
	 npm run dist
	 ```
* An installer and executable should be created in the new dist folder

## Setup
### All Versions
On start up KCDC will ask you to locate the Data directory. This is the directory that contains all the `.pak` files such as `Characters.pak`.
### No Texture Version
This version will need to extract and recreate the converted textures. Follow the setup for all versions. When prompted to rebuild the texture database hit yes. A browser window will open where you can download Eppi's SC Texture Converter. Place the extracted contents, e.g. sctc-1.3.zip, into the KCDC folder. KCDC should detect the converter and begin rebuilding the converted textures.
### Changing settings
Deleting the config.json, will reset all settings to default. Settings can also be changed in this file.

## Using KCD Customizer
* Select the head you would like to use as Henry's then hit export.
* Go to the directory displayed
* Drag the kcd_custom folder into your Kingdom Come Deliverance Mod folder
* Start up the game!

## Planned Features
~~completed~~
* ~~Swap and head for Henry's~~
* Easily swap and use custom textures for any chosen head
* Swap facial props between character heads

## Unlikely features
* Add morph targets to each face, allow true customization (only if CryEngine modeling tools release)

## Known Bugs
* Not all heads fit properly. Female heads, several others. These are apparent by their position in the render window
* Face props, e.g. beards and hair, may be missing in the renderer but present in the game
* General lack of robustness. (If recreating the texture database, press yes only once, and don't press no after)
* Text bar when selecting directory currently says KCD.exe
* A small amount of heads are invisible
* Perspective camera creates too much distortion, will be changing to orthographic