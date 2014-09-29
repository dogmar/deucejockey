import slowclap as sc
import httplib
import sched, time

import sys
import optparse

import select

import json

import os

import threading

THRESHOLD = 5e6
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
                      help='Noises over the threshold must be shorter than this time in seconds to count as a clap '
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
            print "Can't start detector_thread", e

        self.main_loop()


    def emit_clap(self, timestamp=None, volume=0):
        if timestamp is None:
            timestamp = time.time()

        output = {
            'clap': {
                'time': timestamp,
                'volume': volume
            }
        }

        sys.stdout.write(json.dumps(output, sort_keys=True) + '\n')
        sys.stdout.flush()

    def read_detector(self):
        # fo = os.fdopen(3, "w")

        print test
        for clap in self.detector:
            print(clap)
            self.emit_clap(timestamp=clap.time, volume=clap.volume.astype(float))
            # output = {
            #     'clap': {
            #         'time': clap.time,
            #         'volume': clap.volume.astype(float)
            #     }
            # }
            # sys.stdout.write(json.dumps(output, sort_keys=True))
            # sys.stdout.flush()
        print('read_detector_done')

    def threshold_up(self):
        self.detector.threshold *= 1.2
        print 'Threshold:', self.detector.threshold
        sys.stdout.flush()

    def threshold_down(self):
        self.detector.threshold /= 1.2
        print 'Threshold:', self.detector.threshold
        sys.stdout.flush()

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
                        self.threshold_up()
                    elif (c == 'z' or c == 'Z'):
                        self.threshold_down()
                    elif (c == 'c' or c == 'C'):
                        self.emit_clap()
                except IOError: pass
        finally:
            termios.tcsetattr(fd, termios.TCSAFLUSH, oldterm)
            fcntl.fcntl(fd, fcntl.F_SETFL, oldflags)


            # try:
            #     line = sys.stdin.readline()
            # except KeyboardInterrupt:
            #     break

            # if not line:
            #     break

            # print line


    def main_loop(self):
        while 1:
            time.sleep(1)




def main():
    argv = sys.argv[1:]
    print('[{0}]'.format(1.5e7))
    print(1.5e7)
    parser = _create_option_parser()
    print '2'
    (options, args) = parser.parse_args(argv)
    print '3'
    detector = ClapDetector(threshold=options.threshold,
                 window=options.window,
                 wait=options.wait)
    print '4'
    detector.detect_claps()
    print '5'

if __name__ == '__main__':
    main()