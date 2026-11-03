# Bench tests

Every test below is **not executed**. STUDIO's flashing tools and its view of the safety state are covered by tests against fake devices; no firmware has been sent from STUDIO to a real board over CAN. Write a result only after a person ran the step.

## What the software already covers (no board needed)

- The unit tests cover the flashing sequence against a simulated bus and the reading of the state of the stop.

## Setup

- A CAN adapter connected to a URTC head board or a Robot Controller on a bench supply, actuators disconnected, with a signed firmware image and an older one for the downgrade step.
- A physical emergency-stop button wired as the machine will have it.

## Steps

| # | Step | Expected result | Result |
|---|------|-----------------|--------|
| 1 | Load a firmware file in the flasher and read the version and the hardware identifier of the file and of the board. | A file for another hardware identifier is refused before anything is sent. | not executed |
| 2 | Flash an older image with "allow downgrade" off, then on. | Refused when off; accepted when on and written in the log. | not executed |
| 3 | Flash with "erase the F-RAM" off and on. | The F-RAM keeps its data when off and is cleared when on; check by reading it back. | not executed |
| 4 | Pin the firmware to a release tag and try another tag. | The other tag is refused. | not executed |
| 5 | Interrupt the transfer (cable, power). | STUDIO reports the failure; the board keeps its old image and can be flashed again. | not executed |
| 6 | Press and release the physical emergency stop. | STUDIO shows one stop state that agrees with the head's own and the controller's. Today the state is not unified, so record every place where they differ. | not executed |

## What this bench cannot show

The behaviour of a power cut at the worst moment of a write on boards other than the one used.
