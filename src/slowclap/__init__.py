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
    def __init__(self, feed):
        self.feed = feed
        # self.start_time = time.time()

    def __iter__(self):
        for c in self.feed:
            if self.detect(c):
                yield Clap(c.time)

    def detect(self, chunk):
        # sure, it's a clap, why not? :)
        print('detect')
        return True


class AmplitudeDetector(Detector):
    "Call a sufficiently noisy event a clap."

    def __init__(self, feed, threshold=THRESHOLD):
        super(AmplitudeDetector, self).__init__(feed)
        self.threshold = threshold

    def detect(self, chunk):
        if self.get_volume(chunk) > self.threshold:
            print('detect')
            return True

    def get_volume(self, chunk):
        return abs(chunk.data).sum()


class WindowedDetector(AmplitudeDetector):
    def __init__(self, feed, threshold=THRESHOLD, window=WINDOW, wait=WAIT):
        print('windowed detector')
        super(WindowedDetector, self).__init__(feed, threshold)
        self.wait = wait
        self.window = window
        self.last_clap = None
        self.clap_start = None
        self.num_claps = 0

    def __iter__(self):
        for chunk in self.feed:
            # print('chunk:', chunk.time, abs(chunk.data).sum())
            if self.detect(chunk):
                # audio chunk fits clap characteristics
                print('audio fits clap characteristics', chunk.time)
                if self.clap_start == None:
                    # beginning new clap
                    print('starting new clap')
                    self.clap_start = chunk.time
                elif chunk.time > self.clap_start + self.window:
                    # noise exceeds window
                    print('too noisy')
                    self.clap_start = None
            else:
                if self.clap_start != None and chunk.time > self.wait + self.clap_start:
                   # enough silence has followed clap_start
                    print('a clap at:', chunk.time, self.get_volume(chunk))
                    self.last_clap = None
                    self.clap_start = None
                    print(Clap(chunk.time, self.get_volume(chunk)))
                    yield Clap(chunk.time, self.get_volume(chunk))

    def in_window(self, chunk):
        return chunk.time < self.clap_start + self.window

    def clap_has_started(self, chunk):
        return not (elf.clap_start == None)


class MicrophoneFeed(object):
    def __init__(self):
        self.enabled = True
        self.p = pyaudio.PyAudio()
        self.stream = self.p.open(format=FORMAT, channels=CHANNELS, rate=RATE,
                                  input=True, frames_per_buffer=CHUNK)

    def __iter__(self):
        while self.enabled:
            data = self.stream.read(CHUNK)
            chunk = np.fromstring(data, 'int16')
            yield Chunk(chunk, time.time())

    def close(self):
        self.enabled = False


class VerboseFeed(object):
    def __init__(self, feed):
        self.feed = feed

    def __iter__(self):
        for c in self.feed:
            print('*' * (abs(c.data).sum() // 500000))
            yield c


