#!/usr/bin/env python3

import enum
import random

from randpan import randint

### Gameplay constants
GUN_SIZE = 10
START_CASH = 400
START_GUNS = 5
START_SHIP_SIZE = 60
START_WAREHOUSE = 10000
START_DEBT = 5000
START_YEAR = 1860
START_MONTH = 1

# =====================================================================
# GOODS
# =====================================================================

POSITIVE_SHOCKS = [
    "Famine in South China, Taipan! General cargo prices have risen to the heavens!",
    "An agent for the Moro rebels has been spotted in the area, Taipan! Arms are sky-high here!",
    "Taipan! The wharves here have been burned by rebel samurai! All the silk was destroyed!",
    "Taipan! A fire has swept the area! The price of opium has leaped because of hospital use!"
]

NEGATIVE_SHOCKS = [
    "Malay pirates have flooded the area with cheap general cargo from their booty, Taipan!",
    "Taipan! A period of relative peace has resulted in surplus arms being made available on the local market!",
    "A rival hong has dumped surplus silk on the market here, Taipan! Prices have crashed!",
    "Taipan, a Yankee captain is selling Turkish opium at below-market prices here!"
]

class Goods(enum.IntEnum):

    GENERAL = 0
    ARMS = 1
    SILK = 2
    OPIUM = 3

    def txt(self):
        return self.name.title()

    def pos(self):
        return POSITIVE_SHOCKS[self]

    def neg(self):
        return NEGATIVE_SHOCKS[self]

    @classmethod
    def list(cls):
        return list(map(lambda c: c, cls))

    @classmethod
    def random(cls):
        return random.choice(cls.list())

    @staticmethod
    def prompt(text, display):
        return display.ask_opt3(text, [
            ('o', 'Opium', OPIUM),
            ('s', 'Silk', SILK),
            ('a', 'Arms', ARMS),
            ('g', 'General Cargo', GENERAL),
            ('n', '** Nevermind **', None) ])

OPIUM = Goods.OPIUM
SILK = Goods.SILK
ARMS = Goods.ARMS
GENERAL = Goods.GENERAL
NUM_GOODS = len(Goods.list())


# =====================================================================
# CITIES
# =====================================================================

class City(enum.IntEnum):

    HONG_KONG = 0
    SHANGHAI = 1
    NAGASAKI = 2
    SAIGON = 3
    MANILA = 4
    SINGAPORE = 5
    BATAVIA = 6
    AT_SEA = 7

    def txt(self):
        return self.name.title().replace("_", " ")

    @classmethod
    def list(cls):
        l = list(map(lambda c: c, cls))
        l.remove(AT_SEA)
        return l

    def random_other(self):
        while True:
            o = self.__class__.random()
            if o != self and o != AT_SEA:
                return o

    @classmethod
    def random(cls):
        return random.choice(cls.list())

    @staticmethod
    def prompt(text, display):
        l = [ (g.txt(), g) for g in City.list() ]
        l.append(('** Nevermind **', None))
        return display.ask_opt2(text, l)

HONG_KONG = City.HONG_KONG
SHANGHAI = City.SHANGHAI
NAGASAKI = City.NAGASAKI
SAIGON = City.SAIGON
MANILA = City.MANILA
SINGAPORE = City.SINGAPORE
BATAVIA = City.BATAVIA
AT_SEA = City.AT_SEA


# =====================================================================
# PRICES
# =====================================================================

BASE_PRICES = [
    [ 1,    10, 11, 12, 13, 14, 15, 16 ],
    [ 10,   12, 16, 10, 11, 13, 14, 15 ],
    [ 100,  11, 14, 15, 16, 10, 13, 12 ],
    [ 1000, 11, 16, 15, 14, 12, 10, 13 ],
]

def random_price(x, y):
    p1 = float(x) / 2.0
    p2 = float(randint() % 3) + 1.0
    return int(p1 * p2 * float(y))

def based_random_prices(city):
    return [
        random_price(BASE_PRICES[0][city], BASE_PRICES[0][0]),
        random_price(BASE_PRICES[1][city], BASE_PRICES[1][0]),
        random_price(BASE_PRICES[2][city], BASE_PRICES[2][0]),
        random_price(BASE_PRICES[3][city], BASE_PRICES[3][0]) ]

def pure_random_prices():
    return [
        random.randint(5, 25),
        random.randint(5, 25) * 10,
        random.randint(5, 25) * 100,
        random.randint(5, 25) * 1000 ]


# =====================================================================
# HONG
# =====================================================================

class Hong:

    def __init__(self, name, guns=False):
        self.name = name
        self.cash = START_CASH
        self.month = START_MONTH
        self.year = START_YEAR
        self.ship_size = START_SHIP_SIZE
        self.ship_goods = [ 0 ] * NUM_GOODS
        self.ship_guns = START_GUNS if guns else 0
        self.ship_repair = 100
        self.warehouse_size = START_WAREHOUSE
        self.warehouse_goods = [ 0 ] * NUM_GOODS
        self.cash = 0 if guns else START_CASH
        self.debt = 0 if guns else START_DEBT
        self.bank = 0
        self.threatened = False
        self.extorted = 0
        self.bailed_out = 0
        self.location = HONG_KONG
        self.prices = pure_random_prices()
        self.transfer = 0

    def current_time(self):
        return (self.year - 1860) * 12 + self.month

    def warehouse_stored(self):
        return sum(self.warehouse_goods)

    def warehouse_available(self):
        return self.warehouse_size - self.warehouse_stored()

    def warehouse_contains(self, good):
        return self.warehouse_goods[good] > 0

    def ship_stored(self):
        return sum(self.ship_goods)

    def ship_available(self):
        return self.ship_size - self.ship_stored() - GUN_SIZE * self.ship_guns

    def is_broke(self):
        no_cash  = self.cash == 0 and self.bank == 0
        no_goods = self.ship_stored() == 0 and self.warehouse_stored() == 0
        return no_cash and no_goods

