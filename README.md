# NodeWirelessThermo

This is a simple implementation of a Temperature Monitor using Raspberry Pi, Node, Express and 3 DS18B20AB One-wire temperature sensors that are packaged in waterproof 3-wire cable.  The sensors attach to the RPi GPIO.
The UI shows the current, high, and low temperatures for Outside, Pipe, and Inside temperatures. The environment (in this case) is an uninsulated shed-like attachment to an apartment that houses a freezer, some storage, and a water pipe that eventually exits to an external faucet.  In the winter, the pipe has frozen and cracked. To prevent that from happening again, an effecient electric heater was installed (its switch set to always ON) and is connected to a Grainger Thermo Switch that is ON when it senses its ambient temperature in the 35F to 45F range.
This project is overkill but fun, with just the right amount of challenge to keep it interesting and fun for me.

## Parts
This project is made up of 'spare parts' and consists of:
- [ ] Isolated Wifi Router (For LAN use only - no internet)
- [ ] RPi - We are using a model 3B+ with Raspbian OS Bullseye
- [ ] Tablet - In this case, a 10.1" Android 10. But any smart device or computer will work.
## Assembly
### DS18B20 Assembly
This app expects to see 3 of the DS18B20 One-wire Temperature Sensors connected together in parallel with a single 4.7 Kohm resistor from the sensor's digital signal pin to +3.3VDC.<br/>Connections are: 
- [ ] Sensor Power to GPIO +3.3, 
- [ ] Sensor Ground to GPIO GND, 
- [ ] Sensor Signal to GPIO4.

<br/>For clarity, PARALLEL means all of the Temperature Sensors' Powers are soldered together, all of the Temperature Sensors' Grounds are soldered together, and all of the Temperatrure Sensors' Digital Signals are soldered together. The 4.7 Kohm resistor is then solder to the Power bundle and Digital Signal bundle. Each of these 'bundles' are then shrink wrapped to prevents electical shorting.
### RPi
For simplicity, we are using the Raspbian OS (Bullseye) that can be obtained and installed from the Raspberry Pi Foundation website.  The headless version is adequate for this project, but any version will work.
- [ ] Install Node.js and NPM
- [ ] GIT should already be installed with the OS.  If not, apt-get it.
- [ ] From /home/pi <b><i>git clone https://github.com/Thuddwin/NodeWirelessThermo.git</i></b>
- [ ] Edit the /boot/config.text file, add to the end of the file: <b><i>dtoverlay=w1-gpio</i></b>
- [ ] Reboot
- [ ] cd to NodeWirelessThermo, then start the app by typing: <B><i>cls; node ./app.js</i></b>
- [ ] Navigate a browser to <b><i>http://\<IP ADDRESS OF RASPBERRY PI\>:4000</i></b>
- [ ] More than one browser can connect to Server.  
### Le Potato
Due to availability and skyrocketing price issues with Raspberry Pi, we looked into alternatives and chose the Libre 'Le Potato'.  What we found extremely favorable to this product was the following:
- [ ] Raspbian OS 11 can be installed using the RPi Imager,
- [ ] The Wiring Tool makes setting up dtoverlays insanely easy. No need to edit /boot/config.txt like the RPi:
    - [] sudo apt update
    - [] sudo apt install libretech-gpio libretech-dtoverlay
    - [] sudo ldto merge w1-gpio  (This command will ensure the w1-gpio overlay is loaded on every boot)
    - [] For more on the Wire Tool, see: https://hub.libre.computer/t/libre-computer-wiring-tool/40
- [ ] Although 'Le Potato' is lacking onboard Wifi, getting Wifi was literally as easy as plugging a CKXW1000 dongle into the USB port and running raspi-config to name the SSID and password.  Absolutely nothing else was required except a reboot.
- [ ] Other than these steps, everything that is required to build an RPi is the same to build a Le Potato!
### RPi and Le Potato
The Router Address Reservation should be utilized for this app because it is the Server that the Clients will be 'looking' for. We set ours to: 192.168.1.14 because that is the IP Address that is hardcoded in our Android Webview app (allows full screen on Android).
