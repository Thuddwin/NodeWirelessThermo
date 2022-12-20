# NodeWirelessThermo

This is a simple implementation of a Temperature Monitor using Raspberry Pi, Node, Express and 3 DS18B20AB One-wire temperature sensors that are packaged in waterproof 3-wire cable.  The sensors attach to the RPi GPIO.
The UI shows current, high, and low temperatures for Outside, Pipe, and Inside temperatures. The environment (in this case) is an uninsulated shed-like attachment to an apartment that houses a freezer, some storage, and a water pipe that eventually exits to an external faucet.  In the winter, the pipe has frozen and cracked. To prevent that from happening again, an effecient electric heater was installed (its switch set to always ON) and is connected to a Grainger Thermo Switch that is ON when it senses its ambient temperature in the 35F to 45F range.
This project may be temporary once the heating solution is found to be reliable.

## Parts
This project is made up of 'spare parts' and consists of:
- [ ] Isolated Wifi Router (For LAN use only - no internet)
- [ ] RPi - We are using a model 3B+ with Bullseye
- [ ] Tablet - In this case, a 10.1" Android 10. But any smart device or computer will work.
## Assembly
### RPi
For simplicity, we are using the Raspbian OS (Bullseye) that can be obtained and installed from the Raspberry Pi Foundation website.  The headless version is adequate for this project, but any version will work.
= [ ] Install Node.js and NPM
- [ ] GIT should already be installed with the OS.  If not, apt-get that.
- [ ] From /home/pi git the project: https://github.com/
