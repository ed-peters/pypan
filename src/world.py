#!/usr/bin/env python3

import enum
import random

from config import Cities, Goods, HOME, P
from randpan import randint

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
        self.cash = P("start.cash")
        self.month = P("start.month")
        self.year = P("start.year")
        self.ship_size = P("start.ship_size")
        self.ship_goods = Goods.new_basket()
        self.ship_guns = P("start.guns") if guns else 0
        self.ship_repair = 100
        self.warehouse_size = P("start.warehouse_size")
        self.warehouse_goods = Goods.new_basket()
        self.cash = 0 if guns else P("start.cash")
        self.debt = 0 if guns else P("start.debt")
        self.bank = 0
        self.threatened = False
        self.extorted = 0
        self.bailed_out = 0
        self.location = HOME
        self.prices = pure_random_prices()
        self.transfer = 0

    def current_time(self):
        return (self.year - P("start.year")) * 12 + self.month

    def warehouse_stored(self):
        return sum(self.warehouse_goods)

    def warehouse_available(self):
        return self.warehouse_size - self.warehouse_stored()

    def warehouse_contains(self, good):
        return self.warehouse_goods[good] > 0

    def ship_stored(self):
        return sum(self.ship_goods)

    def ship_available(self):
        return self.ship_size - self.ship_stored() - P("gun.size") * self.ship_guns

    def is_broke(self):
        no_cash  = self.cash == 0 and self.bank == 0
        no_goods = self.ship_stored() == 0 and self.warehouse_stored() == 0
        return no_cash and no_goods
