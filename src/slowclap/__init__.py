#!/usr/bin/env python2
# -*- coding: utf-8 -*-
#
#  detect_claps.py
#  clapper
#

"""
Detect claps using the microphone.
"""

from __future__ import absolute_import, print_function, division

import sys
import optparse
from collections import deque, namedtuple
import subprocess

import pyaudio
import numpy as np
import time

CHUNK = 512#1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100

#defaults
THRESHOLD = 1.5e6
WINDOW =.05
WAIT=.5

Chunk = namedtuple('Chunk', 'data time')
Clap = namedtuple('Clap', ['time', 'volume'])

class Detector(object):
    def __init__(self):
        self.enabled = True
        self.p = pyaudio.PyAudio()
        self.stream = self.p.open(format=FORMAT, channels=CHANNELS, rate=RATE,
                                  input=True, frames_per_buffer=CHUNK)

    def __iter__(self):
        while self.enabled:
            # Read data
            data = self.stream.read(CHUNK)
            # Convert to numpy array
            chunk = np.fromstring(data, 'int16')
            yield Clap(time.time(), get_volume(chunk))

    def detect(self, chunk):
        # sure, it's a clap, why not? :)
        print('detect')
        return True

    def get_volume(self, chunk):
        return abs(chunk).sum()

    def close(self):
        self.enabled = False


class AmplitudeDetector(Detector):
    "Call a sufficiently noisy event a clap."

    def __init__(self, threshold=THRESHOLD):
        super(AmplitudeDetector, self).__init__()
        self.threshold = threshold

    def detect(self, chunk):
        if self.get_volume(chunk) > self.threshold:
            print('detect')
            return True


class WindowedDetector(AmplitudeDetector):
    def __init__(self, threshold=THRESHOLD, window=WINDOW, wait=WAIT):
        print('windowed detector')
        super(WindowedDetector, self).__init__(threshold)
        self.wait = wait
        self.window = window
        self.last_clap = None
        self.clap_start = None
        self.num_claps = 0

    def __iter__(self):
        while self.enabled:
            data = self.stream.read(CHUNK)
            chunk = np.fromstring(data, 'int16')
            cur_time = time.time()

            # print('chunk:', cur_time, abs(chunk).sum())
            if self.detect(chunk):
                # audio chunk fits clap characteristics
                print('audio fits clap characteristics', cur_time)
                if self.clap_start == None:
                    # beginning new clap
                    print('starting new clap')
                    self.clap_start = cur_time
                elif cur_time > self.clap_start + self.window:
                    # noise exceeds window
                    print('too noisy')
                    self.clap_start = None
            else:
                if self.clap_start != None and cur_time > self.wait + self.clap_start:
                   # enough silence has followed clap_start
                    print('a clap at:', cur_time, self.get_volume(chunk))
                    self.last_clap = None
                    self.clap_start = None
                    print(Clap(cur_time, self.get_volume(chunk)))
                    yield Clap(cur_time, self.get_volume(chunk))

    # def in_window(self, time):
    #     return time < self.clap_start + self.window

    def clap_has_started(self, chunk):
        return not (elf.clap_start == None)