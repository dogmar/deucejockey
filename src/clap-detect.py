import slowclap as sc
import httplib
import sched, time
import math
import sys
import optparse
import select
import json
import os
import threading
from collections import deque

THRESHOLD = 5e12
WINDOW =.05
WAIT=.2


def _create_option_parser():
    usage = \
"""%prog [options]

Detect claps on the default microphone."""  # nopep8

    parser = optparse.OptionParser(usage)
    parser.add_option('-v', '--verbose',
                      action='store_true',
                      help='Print the stream of volume recorded')
    parser.add_option('-t', '--threshold',
                      action='store',
                      type='int',
                      default=THRESHOLD,
                      help='The volume threshold for a clap '
                      '[{0}]'.format(THRESHOLD))
    parser.add_option('-w', '--window',
                      action='store',
                      type='float',
                      default=WINDOW,
                      help='Noises over the zz must be shorter than this time in seconds to count as a clap '
                      '[{0}]'.format(WINDOW))
    parser.add_option('-W', '--wait', 
                      action='store',
                      type='float',
                      default=WAIT,
                      help='Mininum silence in seconds after clap start before a clap is registered '
                      '[{0}]'.format(WAIT)
                      )

    return parser

test = "test"


class ClapDetector(object):
    def __init__(self, threshold=THRESHOLD, window=WINDOW, wait=WAIT):
        self.detector = sc.WindowedDetector(threshold=threshold,
                                            window=window,
                                            wait=wait)
        self.claps = deque()
        self.set_sensitivity(.5)

    def detect_claps(self):
        print 'detect claps'
        try:
            self.detector_thread = threading.Thread(target=self.read_detector)
            self.detector_thread.daemon = True
            self.detector_thread.start()
        except Exception as e:
            print "Can't start detector_thread", e

        try:
            self.input_thread = threading.Thread(target=self.read_keyboard)
            self.input_thread.daemon = True
            self.input_thread.start()
        except Exception as e:
            print "Can't start input_thread", e

        try:
            self.emitter_thread = threading.Thread(target=self.start_emitter)
            self.emitter_thread.daemon = True
            self.emitter_thread.start()
        except Exception as e:
            print "Can't start emitter_thread", e

        try:
            self.lcd_thread = threading.Thread(target=self.lcd_loop)
            self.lcd_thread.daemon = True
            self.lcd_thread.start()
        except Exception as e:
            print "Can't start lcd_thread", e

        self.main_loop()

    def start_emitter(self):
        while 1:
            if len(self.claps) > 0:
                clap = self.claps.popleft()
                self.emit_clap(timestamp=clap.time, volume=clap.volume)
            time.sleep(.001)


    def emit_clap(self, timestamp=None, volume=0):
        if timestamp is None:
            timestamp = time.time()

        print('{"clap": {"time": '+repr(timestamp)+', "volume": '+str(volume)+'}}')

    def read_detector(self):
        print ('read_detector starting')
        for clap in self.detector:
            self.claps.append(clap)

    def set_sensitivity(self, sensitivity):
        if sensitivity > 0.99:
            sensitivity = 0.99
        elif sensitivity < 0.00:
            sensitivity = 0.00
        self.sensitivity = sensitivity

        threshold = (math.pow(THRESHOLD, (1 - sensitivity)))
        self.detector.threshold = threshold
        print 'Threshold:', self.detector.threshold, 'Sensitivity:', self.sensitivity
        sys.stdout.flush()


    def sensitivity_up(self):
        self.set_sensitivity(self.sensitivity + .01)

    def sensitivity_down(self):
        self.set_sensitivity(self.sensitivity - .01)

    def read_keyboard(self):
        import termios, fcntl, sys, os
        fd = sys.stdin.fileno()

        oldterm = termios.tcgetattr(fd)
        newattr = termios.tcgetattr(fd)
        newattr[3] = newattr[3] & ~termios.ICANON & ~termios.ECHO
        termios.tcsetattr(fd, termios.TCSANOW, newattr)

        oldflags = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, oldflags | os.O_NONBLOCK)

        try:
            while 1:
                try:
                    c = sys.stdin.read(1)
                    if (c == 'a' or c == 'A'):
                        self.sensitivity_up()
                    elif (c == 'z' or c == 'Z'):
                        self.sensitivity_down()
                    elif (c == 'c' or c == 'C'):
                        self.emit_clap()
                except IOError: pass
        finally:
            termios.tcsetattr(fd, termios.TCSAFLUSH, oldterm)
            fcntl.fcntl(fd, fcntl.F_SETFL, oldflags)

    def lcd_loop(self):
        from time import sleep
        from Adafruit_CharLCDPlate import Adafruit_CharLCDPlate

        # Initialize the LCD plate.  Should auto-detect correct I2C bus.  If not,
        # pass '0' for early 256 MB Model B boards or '1' for all later versions
        lcd = Adafruit_CharLCDPlate()

        # Clear display and show greeting, pause 1 sec
        lcd.clear()
        lcd.message("Deuce Jockey")
        sleep(1)

        # Cycle through backlight colors
        col = (lcd.RED , lcd.YELLOW, lcd.GREEN, lcd.TEAL,
               lcd.BLUE, lcd.VIOLET, lcd.ON   , lcd.OFF)
        for c in col:
            lcd.backlight(c)
            sleep(.1)

        # Poll buttons, display message & set backlight accordingly
        # lcd.backlight(lcd.RED)

        while True:
            if lcd.buttonPressed(lcd.UP):
                print('UP')
                self.sensitivity_up()
            elif lcd.buttonPressed(lcd.DOWN):
                print('DOWN')
                self.sensitivity_down()
            if lcd.buttonPressed(lcd.UP) or lcd.buttonPressed(lcd.DOWN):
                sleep(.1)
            lcd.clear()
            lcd.message("Deuce Jockey\nSensitivity: "+repr(round(self.sensitivity * 100)))
            lcd.backlight(lcd.RED)


    def main_loop(self):
        while 1:
            time.sleep(1)




def main():
    argv = sys.argv[1:]
    parser = _create_option_parser()
    (options, args) = parser.parse_args(argv)
    detector = ClapDetector(threshold=options.threshold,
                 window=options.window,
                 wait=options.wait)
    detector.detect_claps()

if __name__ == '__main__':
    main()