#!/usr/bin/env python3

import random

def randint():
    return random.randint(0, 2147483647)

def randfloat():
    return random.random()

def chance_of(n):
    return randint() % n == 0

def in_range(lo, hi):
    return random.randint(lo, hi-1)


