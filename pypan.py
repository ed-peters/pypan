#!/usr/bin/env python3

# Big font = DiamFont
# Small font = Cybermedium

import calendar
import curses
import random
import textwrap

from math import floor, pow

# =====================================================================================
#  ▗▄▄▖ ▗▄▖ ▗▖  ▗▖▗▄▄▄▖▗▄▄▄▖ ▗▄▄▖
# ▐▌   ▐▌ ▐▌▐▛▚▖▐▌▐▌     █  ▐▌   
# ▐▌   ▐▌ ▐▌▐▌ ▝▜▌▐▛▀▀▘  █  ▐▌▝▜▌
# ▝▚▄▄▖▝▚▄▞▘▐▌  ▐▌▐▌   ▗▄█▄▖▝▚▄▞▘
                               
START_CASH = 400
START_DEBT = 5000
START_YEAR = 1860
START_MONTH = 1
START_GUNS = 5
START_SHIP_SIZE = 60
START_WAREHOUSE_SIZE = 10000
GUN_SIZE = 10
ROCKET_SIZE = 3
LOAN_RATE = 0.1
BANK_RATE = 0.05
SHIP_SIZE_INCREMENT = 50
WAREHOUSE_SIZE_INCREMENT = 5000
DEBT_THREAT_LEVEL = 20000
DEBT_MULTIPLIER = 2
ROBBERY_CASH_LIMIT = 20000
PRICE_SIGMA = 15.0

# =====================================================================================
# ▗▖ ▗▖▗▄▄▄▖▗▖   ▗▄▄▖ ▗▄▄▄▖▗▄▄▖  ▗▄▄▖
# ▐▌ ▐▌▐▌   ▐▌   ▐▌ ▐▌▐▌   ▐▌ ▐▌▐▌   
# ▐▛▀▜▌▐▛▀▀▘▐▌   ▐▛▀▘ ▐▛▀▀▘▐▛▀▚▖ ▝▀▚▖
# ▐▌ ▐▌▐▙▄▄▖▐▙▄▄▖▐▌   ▐▙▄▄▖▐▌ ▐▌▗▄▄▞▘

def seed(n):
    random.seed(n)

def randint():
    return random.randint(0, 2147483647)

def randfloat():
    return random.random()

def chance_of(n):
    return randint() % n == 0

def randrange(n):
    return randint() % int(n)

def in_range(lo, hi):
    return lo + randrange(hi - 1 - lo)

# =====================================================================================
#  ▗▄▄▖▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖ ▗▄▄▖
# ▐▌     █    █    █  ▐▌   ▐▌   
# ▐▌     █    █    █  ▐▛▀▀▘ ▝▀▚▖
# ▝▚▄▄▖▗▄█▄▖  █  ▗▄█▄▖▐▙▄▄▖▗▄▄▞▘

CITIES = [
    "Hong Kong", "Shanghai", "Nagasaki",
    "Saigon", "Manila", "Singapore", "Batavia"
]

HONG_KONG = 0
SHANGHAI = 1
NAGASAKI = 2
SAIGON = 3
MANILA = 4
SINGAPORE = 5
BATAVIA = 6
AT_SEA = 7
NUM_CITIES = len(CITIES) - 1

def city(n):
    return CITIES[n] if n < len(CITIES) else "At Sea"

def random_other_city(n):
    while True:
        o = randrange(NUM_CITIES)
        if o != n:
            return o

# =====================================================================================
#  ▗▄▄▖ ▗▄▖  ▗▄▖ ▗▄▄▄   ▗▄▄▖
# ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌  █ ▐▌   
# ▐▌▝▜▌▐▌ ▐▌▐▌ ▐▌▐▌  █  ▝▀▚▖
# ▝▚▄▞▘▝▚▄▞▘▝▚▄▞▘▐▙▄▄▀ ▗▄▄▞▘
                          
GOODS = [ "General", "Arms", "Silk", "Opium" ]

GENERAL = 0
ARMS = 1
SILK = 2
OPIUM = 3
# JADE = 4
# COTTON = 5
# TEA = 6
# SUGAR = 7
# SPICES = 8
# RUBIES = 9
NUM_GOODS = 4

def good(n: int):
    return GOODS[n]

def mult(n: int):
    return pow(10, n)

BASE_PRICES = [
    [ 1, 11, 16, 15, 14, 12, 10, 13 ],
    [ 10, 11, 14, 15, 16, 10, 13, 12 ],
    [ 100, 12, 16, 10, 11, 13, 14, 15 ],
    [ 1000, 10, 11, 12, 13, 14, 15, 16 ] ]

def based_prices(city):
    p = [ 0 ] * NUM_GOODS
    for g in range(NUM_GOODS):
        x = 100
        while x < 0.0 or x > 25.0:
            x = random.normalvariate(BASE_PRICES[g][city+1], PRICE_SIGMA)
        p[g] = int(5 + x) * BASE_PRICES[g][0]
    return p

def random_prices(city):
    p = [ 0 ] * NUM_GOODS
    for g in range(NUM_GOODS):
        p[g] = int(in_range(5, 31) * mult(g))
    return p

# =====================================================================================
# ▗▖ ▗▖ ▗▄▖ ▗▖  ▗▖ ▗▄▄▖
# ▐▌ ▐▌▐▌ ▐▌▐▛▚▖▐▌▐▌   
# ▐▛▀▜▌▐▌ ▐▌▐▌ ▝▜▌▐▌▝▜▌
# ▐▌ ▐▌▝▚▄▞▘▐▌  ▐▌▝▚▄▞▘

class NotEnoughCash(Exception): pass
class NotEnoughSpace(Exception): pass
class NotEnoughGoods(Exception): pass
class TooMuchDebt(Exception): pass

class Hong:

    def __init__(self, name: str, guns:bool=False):
        self.name = name
        self.year = START_YEAR
        self.month = START_MONTH
        self.cash = 0 if guns else START_CASH
        self.debt = 0 if guns else START_DEBT
        self.bank = 0
        self.ship_size = START_SHIP_SIZE
        self.ship_goods = [ 0 ] * NUM_GOODS
        self.ship_guns = START_GUNS if guns else 0
        self.ship_rockets = 0
        self.ship_repair = 100
        self.ship_cargo = None
        self.pirate_chance = 7 if guns else 10
        self.warehouse_size = START_WAREHOUSE_SIZE
        self.warehouse_goods = [ 0 ] * NUM_GOODS
        self.threatened = False
        self.extorted = 0
        self.bailout = 1
        self.location = HONG_KONG
        self.transfer = 0
        self.prices = based_prices(HONG_KONG)

    def advance_time(self):
        if self.month == 12:
            self.year += 1
            self.month = 1
        else:
            self.month += 1

    def current_time(self):
        return (self.year - START_YEAR) * 12 + self.month

    def total_goods(self):
        return sum(self.ship_goods)

    def total_non_goods(self):
        return self.ship_cargo.size if self.ship_cargo else 0 \
            + self.ship_rockets * ROCKET_SIZE \
            + self.ship_guns * GUN_SIZE

    def ship_available(self):
        return self.ship_size \
                - self.total_goods() \
                - self.total_non_goods()

    def warehouse_has(self, good: int):
        return self.warehouse_goods[good] != 0

    def warehouse_used(self):
        return sum(self.warehouse_goods)

    def warehouse_available(self):
        return self.warehouse_size - self.warehouse_used()
    
    def has_any(self, good: int):
        return self.ship_goods[good] > 0 or self.warehouse_goods[good] > 0

    def is_overloaded(self):
        return self.ship_available() < 0

    def is_broke(self):
        no_cash = self.cash == 0
        no_goods = sum(self.ship_goods) == 0 and sum(self.warehouse_goods) == 0
        return no_cash and no_goods
    
    def __repr__(self):
        return str(vars(self))
    
# =====================================================================================
# ▗▖ ▗▖▗▄▄▖  ▗▄▄▖▗▄▄▖  ▗▄▖ ▗▄▄▄  ▗▄▄▄▖ ▗▄▄▖
# ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌  █ ▐▌   ▐▌   
# ▐▌ ▐▌▐▛▀▘ ▐▌▝▜▌▐▛▀▚▖▐▛▀▜▌▐▌  █ ▐▛▀▀▘ ▝▀▚▖
# ▝▚▄▞▘▐▌   ▝▚▄▞▘▐▌ ▐▌▐▌ ▐▌▐▙▄▄▀ ▐▙▄▄▖▗▄▄▞▘

def check_upgrades(hong, display):

    # mchenry can repair your ship if you're at home
    if hong.location == HONG_KONG and hong.ship_repair < 100:
        # TODO implement repair logic
        pass
    
    # upgrades don't come until you've been playing a while
    if hong.current_time() > 6 and chance_of(4):

        time = hong.current_time()

        # offer a new ship (but only if they can afford it)
        if chance_of(2):
            cost = randrange(1000.0 * (time + 5.0) / 6.0) * int(hong.ship_size / 50.0) + 1000
            cond = "damaged" if hong.ship_repair < 80 else "fine"
            if hong.cash >= cost and display.ask_yn("Would you like to replace your %s ship with another one that has %d more capacity by paying an additional %d, Taipan?" % (cond, SHIP_SIZE_INCREMENT, cost)):
                hong.cash -= cost
                hong.ship_size += SHIP_SIZE_INCREMENT
                hong.ship_repair = 100
                display.update(hong)
        
        # offer a new gun (but only if they can afford it, and have room)
        else:
            cost = randrange(1000.0 * (time + 5.0) / 6.0) + 500
            if hong.cash > cost:
                if chance_of(2):
                    if display.ask_yn("Would you like to buy a ship's gun for %d, Taipan?" % cost):
                        hong.cash -= cost
                        hong.ship_guns += 1
                else:
                    if display.ask_yn("Would you like to buy a rocket for %d, Taipan?" % cost):
                        hong.cash -= cost
                        hong.ship_rockets += 1
                display.update(hong)

# =====================================================================================
# ▗▖ ▗▖ ▗▄▖ ▗▄▄▖ ▗▄▄▄▖▗▖ ▗▖ ▗▄▖ ▗▖ ▗▖ ▗▄▄▖▗▄▄▄▖
# ▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌   
# ▐▌ ▐▌▐▛▀▜▌▐▛▀▚▖▐▛▀▀▘▐▛▀▜▌▐▌ ▐▌▐▌ ▐▌ ▝▀▚▖▐▛▀▀▘
# ▐▙█▟▌▐▌ ▐▌▐▌ ▐▌▐▙▄▄▖▐▌ ▐▌▝▚▄▞▘▝▚▄▞▘▗▄▄▞▘▐▙▄▄▖

def check_warehouse(hong, display):

    # establish the transfer price for goods to and from the warehouse
    if hong.location == HONG_KONG:
        hong.transfer = 0
    elif hong.current_time() > 12 and chance_of(6):
        hong.transfer = randrange(5) + 5
        display.say("Good joss! A lorcha is waiting nearby and can transfer goods with your warehouse in Hong Kong for %s%%, Taipan." % hong.transfer)
    else:
        hong.transfer = -1

    # if we're at home, we might be able to upgrade the warehouse
    if hong.location == HONG_KONG:
        if hong.current_time() > 12 and chance_of(10):
            time = hong.current_time()
            cost = randrange(1000.0 * (time + 5.0) / 6.0) * int(hong.warehouse_size / 500) + 1000;
            if hong.cash >= cost and display.ask_yn("A new warehouse with an additional %d capacity is available for %d. Would like to upgrade, Taipan?" % (WAREHOUSE_SIZE_INCREMENT, cost)):
                hong.cash -= cost
                hong.warehouse_size += WAREHOUSE_SIZE_INCREMENT
                display.update(hong)

def transfer(hong, display):

    # decide what good we're going to transfer; if we have none, there's no point
    g = display.ask_opt("What shall I transfer, Taipan?", GOODS, True)
    if g == None:
        return
    if not hong.has_any(g):
        display.say("You have no %s to transfer, Taipan." % good(g))
        return

    # if we have any space in the warehouse, we can offload the good
    if hong.warehouse_available() > 0:
        n = display.ask_num("How much %s should I send to the warehouse, Taipan?" % good(g), min(hong.ship_goods[g], hong.warehouse_available()))
        if n > hong.ship_goods[g]:
            display.say("You do not have that much in your ship's hold, Taipan.")
        elif n > hong.warehouse_available():
            display.say("You have no space in the warehouse, Taipan.")
        elif n > 0:
            hong.ship_goods[g] -= n
            hong.warehouse_goods[g] += n - int(n * (hong.transfer / 100.0))
            display.update(hong)

    # we can always load stuff on the ship
    n = display.ask_num("How much %s should I bring onto the ship, Taipan?" % good(g), hong.warehouse_goods[g])
    if n > hong.warehouse_goods[g]:
        display.say("You do not have that much in your warehouse, Taipan.")
    elif n > 0:
        hong.warehouse_goods[g] -= n
        hong.ship_goods[g] += n - int(n * (hong.transfer / 100.0))
        display.update(hong)

# =====================================================================================
# ▗▖  ▗▖ ▗▄▖ ▗▖  ▗▖▗▄▄▄▖▗▖  ▗▖▗▖   ▗▄▄▄▖▗▖  ▗▖▗▄▄▄  ▗▄▄▄▖▗▄▄▖ 
# ▐▛▚▞▜▌▐▌ ▐▌▐▛▚▖▐▌▐▌    ▝▚▞▘ ▐▌   ▐▌   ▐▛▚▖▐▌▐▌  █ ▐▌   ▐▌ ▐▌
# ▐▌  ▐▌▐▌ ▐▌▐▌ ▝▜▌▐▛▀▀▘  ▐▌  ▐▌   ▐▛▀▀▘▐▌ ▝▜▌▐▌  █ ▐▛▀▀▘▐▛▀▚▖
# ▐▌  ▐▌▝▚▄▞▘▐▌  ▐▌▐▙▄▄▖  ▐▌  ▐▙▄▄▖▐▙▄▄▖▐▌  ▐▌▐▙▄▄▀ ▐▙▄▄▖▐▌ ▐▌
                                                            
def check_lender(hong, display):    

    # EBW is only in Hong Kong
    if hong.location != HONG_KONG:
        return
    
    # Up-front action only happens if you owe money
    if hong.debt > 0:

        # If you owe him too much he might remind you of it
        if hong.debt > DEBT_THREAT_LEVEL and not hong.threatened:
            display.say("Elder Brother Wu has sent %d braves to escort you to the Wu mansion, Taipan." % in_range(17, 39))
            display.say("Elder Brother Wu reminds you of the Confucian ideal of personal worthiness, and how this applies to paying one's debts.")
            display.say("He is reminded of a fabled barbarian who came to a bad end, after not caring for his obligations.")
            display.say("He hopes no such fate awaits you, his friend, Taipan.")
            hong.threatened = True

        # If you owe him, you can visit him before doing anything else if you want
        if display.ask_yn("Do you have business with Elder Brother Wu, the moneylender, Taipan?"):
            visit_wu(hong, display)

        # If you still don't get the picture, he might rob you
        if hong.current_time() > 12 and not hong.threatened and chance_of(4):
            display.say("Bad joss!! %d of your bodyguards have been killed by cutthroats and you have been robbed of all of your cash, Taipan!!" % in_range(3, 9))
            hong.cash = 0
            display.update(hong)

def visit_wu(hong, display):

    # if you have no cash when you visit him, he will assume you want a bailou
    if hong.cash == 0:

        # if you're truly broke, he will offer you a lifeline
        if hong.current_time() > 1 and hong.is_broke():
            loan = randrange(1500) + 1500
            cost = randrange(2000) * hong.bailout + 1500
            if display.ask_yn("Elder Brother is aware of your plight, Taipan. He is willing to loan you an additional %d if you will pay back %d. Are you willing, Taipan?" % (loan, cost)):
                hong.cash += loan
                hong.debt += cost
                display.update(hong)
        
        # otherwise, he's not interested
        else:
            display.say("Elder Brother is aware of your plight, Taipan. He urges you to exercise all the means at your disposal to correct it.")
        
        return

    # he will only accept repayment up to the amount of the loan
    x = min(hong.cash, hong.debt)
    if x > 0:
        n = display.ask_num("How much will you repay, Taipan?", x)
        if n <= x:
            hong.cash -= n
            hong.debt -= n
            display.update(hong)
        else:
            display.say("Taipan, you owe only %d." % hong.debt)
    
    # he's willing to loan you up to 2 x the amount of free cash you have
    x = max(0, hong.cash * 2 - hong.debt)
    if x > 0:
        n = display.ask_num( "How much will you borrow, Taipan?", x)
        if n <= x:
            hong.cash += n
            hong.debt += n
            display.update(hong)
        else:
            display.say("Elder Brother Wu will not loan you so much, Taipan.")

# =====================================================================================
# ▗▄▄▖  ▗▄▖ ▗▖  ▗▖▗▖ ▗▖
# ▐▌ ▐▌▐▌ ▐▌▐▛▚▖▐▌▐▌▗▞▘
# ▐▛▀▚▖▐▛▀▜▌▐▌ ▝▜▌▐▛▚▖ 
# ▐▙▄▞▘▐▌ ▐▌▐▌  ▐▌▐▌ ▐▌

def visit_bank(hong, display):

    if hong.cash == 0 and hong.bank == 0:
        display.say("You have no reason to go to the bank, Taipan.")
        return

    if hong.cash > 0:
        n = display.ask_num("How much shall I deposit?", hong.cash)
        if n > hong.cash:
            display.say("You do not have that much cash on hand, Taipan.")
        else:
            hong.cash -= n
            hong.bank += n
            display.update(hong)
    
    if hong.bank > 0:
        n = display.ask_num("How much shall I withdraw?", hong.bank)
        if n > hong.bank:
            display.say("You do not have that much in the bank, Taipan.")
        else:
            hong.cash += n
            hong.bank -= n
            display.update(hong)

# =====================================================================================
# ▗▄▄▄▖▗▄▄▖  ▗▄▖ ▗▄▄▄  ▗▄▄▄▖▗▖  ▗▖ ▗▄▄▖
#   █  ▐▌ ▐▌▐▌ ▐▌▐▌  █   █  ▐▛▚▖▐▌▐▌   
#   █  ▐▛▀▚▖▐▛▀▜▌▐▌  █   █  ▐▌ ▝▜▌▐▌▝▜▌
#   █  ▐▌ ▐▌▐▌ ▐▌▐▙▄▄▀ ▗▄█▄▖▐▌  ▐▌▝▚▄▞▘
                   
MSG_POS_SHOCK = [
    "Famine in South China, Taipan! General cargo prices have risen to the heavens!",
    "An agent for the Moro rebels has been spotted in the area, Taipan! Arms are sky-high here!",
    "Taipan! The wharves here have been burned by rebel samurai! All the silk was destroyed!",
    "Taipan! A fire has swept the area! The price of opium has leaped because of hospital use!"
]

MSG_NEG_SHOCK = [
    "Malay pirates have flooded the area with cheap general cargo from their booty, Taipan!",
    "Taipan! A period of relative peace has resulted in surplus arms being made available on the local market!",
    "A rival hong has dumped surplus silk on the market here, Taipan! Prices have crashed!",
    "Taipan, a Yankee captain is selling Turkish opium at below-market prices here!"        
]
                  
def establish_prices(hong, display):

    hong.prices = random_prices(hong.location)
    display.update(hong)

    # there's a chance of a price shock (either positive or negative)
    if hong.current_time() > 1 and chance_of(10):
        g = randrange(NUM_GOODS)
        if chance_of(2):
            display.say(MSG_POS_SHOCK[g])
            hong.prices[g] *= (in_range(0, 5) + 5)
        else:
            display.say(MSG_NEG_SHOCK[g])
            hong.prices[g] = int(hong.prices[g] / 5)

def buy_goods(hong, display):

    g = display.ask_opt("What shall I buy, Taipan?", GOODS, True)
    if g == None:
        return

    # if you can't afford any, don't bother
    x = floor(hong.cash / hong.prices[g])
    if x == 0:
        display.say("You cannot afford any %s at these prices, Taipan." % good(g).lower())
        return
    
    # go for it
    n = display.ask_num("How much %s shall I buy, Taipan?" % good(g).lower(), x)
    if n > x:
        display.say("You do not have enough cash on hand, Taipan.")
    else:
        hong.cash -= (n * hong.prices[g])
        hong.ship_goods[g] += n
        display.update(hong)

def sell_goods(hong, display):

    g = display.ask_opt("What shall I sell, Taipan?", GOODS, True)
    if g == None:
        return

    # you can't sell something you don't have    
    x = hong.ship_goods[g]
    if x == 0:
        display.say("You have no %s in your ship's hold, Taipan." % good(g).lower())
        return

    n = display.ask_num("How much %s should I sell, Taipan?" % good(g).lower(), x)
    if n > x:
        display.say("You do not have that much in your ship's hold, Taipan.")
    else:
        hong.cash += (n * hong.prices[g])
        hong.ship_goods[g] -= n
        display.update(hong)


# =====================================================================================
#  ▗▄▄▖ ▗▄▖ ▗▄▄▖  ▗▄▄▖ ▗▄▖ 
# ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌   ▐▌ ▐▌
# ▐▌   ▐▛▀▜▌▐▛▀▚▖▐▌▝▜▌▐▌ ▐▌
# ▝▚▄▄▖▐▌ ▐▌▐▌ ▐▌▝▚▄▞▘▝▚▄▞▘

class Cargo:
    def __init__(self, description: str, destination: int, illegal: bool, size: int, value: int):
        self.description = description
        self.destination = destination
        self.illegal = illegal
        self.size = size
        self.value = value
    def __repr__(self):
        return str(vars(self))

def check_cargo(hong, display):

    # cargo doesn't show up until later in the game
    if hong.current_time() > 18:
        return

    # if you have cargo, it's automatically offloaded
    if hong.ship_cargo and hong.location == hong.ship_cargo.destination:
        display.say("We have successfully delivered the %s that was intended for the buyer here in %s, Taipan." % (hong.ship_cargo.description, city(hong.location)))
        hong.cash += hong.ship_cargo.value
        hong.ship_cargo = None
        display.update(hong)
    
    # if we don't have cargo, we might get offered to carry some
    if not hong.ship_cargo: # and chance_of(20):
        c = random_cargo(hong)
        if display.ask_yn("Would you like to accept a consignment of a %s to sell in %s for %d, Taipan (it will take up %d space in the ship's hold)?" % (
                c.description,
                city(c.destination),
                c.value,
                c.size)):
            hong.ship_cargo = c
            display.update(hong)

def random_cargo(hong):
    n = "bronze statue"
    d = random_other_city(hong.location)
    s = in_range(10, int(hong.ship_size * 0.6))
    c = randrange(10000) + 3500
    return Cargo(n, d, False, s, c)

# =====================================================================================
#  ▗▄▄▖ ▗▄▖ ▗▄▄▄▖▗▄▄▄▖▗▄▄▄▖▗▖  ▗▖
# ▐▌   ▐▌ ▐▌▐▌   ▐▌     █   ▝▚▞▘ 
#  ▝▀▚▖▐▛▀▜▌▐▛▀▀▘▐▛▀▀▘  █    ▐▌  
# ▗▄▄▞▘▐▌ ▐▌▐▌   ▐▙▄▄▖  █    ▐▌  

def check_safety(hong, display):

    if hong.current_time() < 12:
        return
    
    # the police might confiscate your opium
    if hong.location != HONG_KONG and hong.ship_goods[OPIUM] > 0 and chance_of(10):
        fine = 0
        if hong.cash > 0:
            fine = int((hong.cash / 1.8) * randfloat()) + 1
            display.say("Bad joss! Harbor police have confiscated your opium and fined you an additional %d, Taipan!" % fine)
            hong.cash -= fine
        else:
            display.say("Bad joss! Harbor police have confiscated your opium, Taipan!")
        hong.ship_goods[OPIUM] = 0
        display.update(hong)

    # you might get beat up and robbed
    if hong.location != HONG_KONG and hong.cash > ROBBERY_CASH_LIMIT and chance_of(20):
        cost = int((hong.cash / 1.4) * randfloat())
        if cost > 0:
            display.say("Bad joss! Your bodyguards were beaten up and you were robbed of %d, Taipan!", cost)
            hong.cash -= cost
            display.update(hong)

    # your warehouse might catch fire
    if hong.warehouse_available() < hong.warehouse_size and chance_of(50):
        display.say("Messenger reports a large warehouse fire, Taipan!")
        for g in range(NUM_GOODS):
            f = int(hong.warehouse_goods[g] * randfloat() / 1.8)
            hong.warehouse_goods[g] = f
        display.update(hong)

# =====================================================================================
# ▗▄▄▄▖▗▖  ▗▖▗▄▄▄▖▗▄▖ ▗▄▄▖▗▄▄▄▖▗▄▄▄▖ ▗▄▖ ▗▖  ▗▖
# ▐▌    ▝▚▞▘   █ ▐▌ ▐▌▐▌ ▐▌ █    █  ▐▌ ▐▌▐▛▚▖▐▌
# ▐▛▀▀▘  ▐▌    █ ▐▌ ▐▌▐▛▀▚▖ █    █  ▐▌ ▐▌▐▌ ▝▜▌
# ▐▙▄▄▖▗▞▘▝▚▖  █ ▝▚▄▞▘▐▌ ▐▌ █  ▗▄█▄▖▝▚▄▞▘▐▌  ▐▌
                                             
def check_extortion(hong, display):

    # the pirate boss gets randomly more angry over time until he boils over
    time = hong.current_time()
    if time > 1 and chance_of(20):
        hong.extorted = (hong.extorted + 1) % 4
    if hong.extorted != 0:
        return

    # if you're not around when he does, he will summon you
    if hong.location != HONG_KONG:
        if chance_of(4):
            display.say("Li Yuen has sent a Lieutenant, Taipan.  He says his admiral wishes to see you in Hong Kong, posthaste!")
        return

    # if you are in Hong Kong, he will hit you up for money
    cost = int((hong.cash / 2.5) * randfloat()) + 1
    if time > 12:
        cost = in_range(0, time * 1000) + (time * 1000)

    # if you don't, you get a warning
    if not display.ask_yn("Li Yuen asks %s in donation to the temple of Tin Hau, the Sea Goddess. Will you pay?" % cost):
        display.say("Very well. I would be wary of pirates if I were you, Taipan.")
        return

    # if you don't have enough, EBW can make up the difference for you
    if hong.cash < cost:
        if display.ask_yn("You do not have enough cash on hand, Taipan! Do you want Elder Brother Wu to make up the difference for you?"):
            display.say("Very well. Elder Brother Wu will not assist you. I would be wary of pirates if I were you, Taipan.")
            return
        display.say("Elder Brother Wu has given Li Yuen the difference and added the same amount to your debt.")
        hong.debt += cost - hong.cash
        cost = hong.cash
    
    # ... and you're good (until next time ...)
    hong.cash -= cost
    hong.extorted = 1
    display.update(hong)

# =====================================================================================
# ▗▄▄▖▗▄▄▄▖▗▄▄▖  ▗▄▖▗▄▄▄▖▗▄▄▄▖ ▗▄▄▖
# ▐▌ ▐▌ █  ▐▌ ▐▌▐▌ ▐▌ █  ▐▌   ▐▌   
# ▐▛▀▘  █  ▐▛▀▚▖▐▛▀▜▌ █  ▐▛▀▀▘ ▝▀▚▖
# ▐▌  ▗▄█▄▖▐▌ ▐▌▐▌ ▐▌ █  ▐▙▄▄▖▗▄▄▞▘

PIRATE_FLEET = 1
PIRATE_KING = 2

class PirateBattle:

    def __init__(self, hong, against):
        self.id = 1 if against == PIRATE_FLEET else 2
        self.pirates = randrange((hong.ship_size / 10) + hong.ship_guns) + 1
        self.base_health = 20 + (hong.year - START_YEAR) * 10
        self.curr_health = int(self.base_health * randfloat()) + 20
        self.run_ik = 1
        self.run_ok = 3
        self.booty = (hong.current_time() / 4 * 1000 * self.pirates) + randrange(1000) + 250
        self.fled = False

    def execute(self, hong, display):
        display.say("%d hostile ships approaching, Taipan!" % self.pirates)
        while self.pirates > 0:
            opts = self.get_opts(hong)
            func = display.ask_opt2("%s enemies remaining ... What shall we do, Taipan?" % self.pirates, opts)
            func(hong, display)
        if not self.fled:
            display.say("We won the battle, Taipan, and we captured some booty worth %d!" % self.booty)
            hong.cash += self.booty
            display.update(hong)

    def get_opts(self, hong):
        l = [ ]
        if hong.ship_rockets > 0:
            l.append(("Launch rockets", self.fire_rockets))
        if hong.ship_guns > 0:
            l.append(("Fire cannons", self.fire_cannons))
        if hong.total_goods() > 0:
            l.append(("Dump cargo", self.dump_cargo))
        l.append(("Run away", self.run_away))
        return l

    def remove_pirates(self, n):
        self.pirates -= n
        self.curr_health = int(self.base_health * randfloat()) + 20
        self.run_ik = 1
        self.run_ok = 3

    def fire_rockets(self, hong, display):
        display.say("Aye, we'll unload our rockets at 'em, Taipan!")
        r = min(hong.ship_rockets, self.pirates)
        self.remove_pirates(r)
        hong.ship_rockets -= r
        if self.pirates == 0:
            r = "all"
        display.say("We got %s of the buggers, Taipan!" % r)
    
    def fire_cannons(self, hong, display):
        display.say("Aye, we'll fire our cannons at 'em, Taipan!")
        k = 0
        for i in range(hong.ship_guns):
            self.curr_health -= randrange(30) + 10
            if self.curr_health < 0:
                self.remove_pirates(1)
                k += 1
        if k > 0:
            if self.pirates == 0:
                k = "all"
            display.say("We got %s of the buggers, Taipan!" % k)

    def run_away(self, hong, display):
        display.say("Aye, we'll set sails and run, Taipan!")
        self.run_ik += 1
        self.run_ok += self.run_ik
        if randrange(self.run_ok) > randrange(self.pirates):
            display.say("We got away from 'em, Taipan!")
            self.pirates = 0
            self.fled = True
        elif self.pirates > 2 and chance_of(5):
            lost = min(int(randrange(num_ships / 2)) + 1, self.pirates - 1)
            display.say("Couldn't lose 'em, Taipan, but we escaped from %d of 'em!" % lost)
            self.pirates -= lost
        else:
            display.say("Couldn't lose 'em, Taipan!")

    def dump_cargo(self, hong, display):
        g = display.ask_opt("What shall I toss overboard, Taipan?", GOODS)
        if g != None:
            n = display.ask_opt("How much %s shall I toss overboard, Taipan?" % good(g), hong.ship_goods[g])
            if n > hong.ship_goods[g]:
                display.say("We don't have enough on board, Taipan!")
            else:
                hong.ship_goods[g] -= n
                self.run_ok += min(1, int(n / 10.0))
                display.update(hong)

def check_pirates(hong, display):
    if chance_of(hong.pirate_chance):
        PirateBattle(hong, PIRATE_FLEET).execute(hong, display)

# =====================================================================================
#  ▗▄▄▖ ▗▄▖ ▗▖  ▗▖▗▄▄▖ ▗▄▄▖  ▗▄▖ ▗▄▄▄   ▗▄▖ ▗▄▄▖ 
# ▐▌   ▐▌ ▐▌▐▛▚▞▜▌▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌▐▌  █ ▐▌ ▐▌▐▌ ▐▌
# ▐▌   ▐▌ ▐▌▐▌  ▐▌▐▛▀▘ ▐▛▀▚▖▐▛▀▜▌▐▌  █ ▐▌ ▐▌▐▛▀▚▖
# ▝▚▄▄▖▝▚▄▞▘▐▌  ▐▌▐▌   ▐▌ ▐▌▐▌ ▐▌▐▙▄▄▀ ▝▚▄▞▘▐▌ ▐▌

CONDITIONS = "Current market conditions are as follows:\n\n  General - %s\n     Arms - %s\n     Silk - %s\n    Opium - %s\n\nWhat shall I do, Taipan?"

def establish_opts(hong):
    opts = [
        ("Buy goods", buy_goods),
        ("Sell goods", sell_goods)
    ]
    if hong.transfer >= 0:
        opts.append(("Transfer goods", transfer))
    if hong.location == HONG_KONG:
        opts.append(("Visit Elder Brother Wu", visit_wu))
        opts.append(("Visit the bank", visit_bank))
    opts.append(("Leave port", sail_away))
    return opts

def compradors_loop(hong, display):
    check_extortion(hong, display)
    check_lender(hong, display)
    while True:
        text = CONDITIONS % tuple([ i2a(x) for x in hong.prices ])
        func = display.ask_opt2(text, establish_opts(hong))
        func(hong, display)

# =====================================================================================
#  ▗▄▄▖ ▗▄▖ ▗▄▄▖▗▄▄▄▖▗▄▖ ▗▄▄▄▖▗▖  ▗▖
# ▐▌   ▐▌ ▐▌▐▌ ▐▌ █ ▐▌ ▐▌  █  ▐▛▚▖▐▌
# ▐▌   ▐▛▀▜▌▐▛▀▘  █ ▐▛▀▜▌  █  ▐▌ ▝▜▌
# ▝▚▄▄▖▐▌ ▐▌▐▌    █ ▐▌ ▐▌▗▄█▄▖▐▌  ▐▌

BOAT = """
    __|__ |___| |\\
    |o__| |___| | \\
    |___| |___| |o \\
   _|___| |___| |__o\\
  /...\_____|___|____\_/
  \   o * o * * o o  /
~~~~~~~~~~~~~~~~~~~~~~~~~~

"""

def sail_away(hong, display):

    if hong.is_overloaded():
        display.say("Your ship is overloaded, Taipan.")
        return

    destination = display.ask_opt("Where shall we sail to, Taipan?", CITIES, True)
    if destination == None:
        return

    # can't go somewhere if you're already there
    if hong.location == destination:
        display.say("You are already in %s, Taipan." % city(hong.location))
        return

    # make it seem like it's a trip ...
    hong.location = AT_SEA
    hong.advance_time()
    display.prefix = BOAT
    display.update(hong)

    check_pirates(hong, display)
    destination = check_storm(hong, display, destination)

    # .. and we're there
    display.say("Arriving at %s ... " % city(destination))
    display.prefix = ""

    # set location and accrue interest
    hong.location = destination
    hong.debt = int(hong.debt * (1.0 + LOAN_RATE))
    hong.bank = int(hong.bank * (1.0 + BANK_RATE))
    display.update(hong)

    # check local events
    check_lender(hong, display)
    check_extortion(hong, display)
    check_upgrades(hong, display)
    check_warehouse(hong, display)
    check_cargo(hong, display)
    check_safety(hong, display)
    establish_prices(hong, display)

def check_pirates(hong, display):
    if chance_of(hong.pirate_chance):
        PirateBattle(hong, PIRATE_FLEET).execute(hong, display)

def check_storm(hong, display, destination):
    if chance_of(10):
        display.say("Storm, Taipan!")
        msg = "We made it"
        if hong.ship_repair > 20 and chance_of(10):
            hong.ship_repair -= in_range(5, 20)
            msg = "%s, but we took some damage!" % msg
        elif chance_of(3):
            destination = random_other_city(destination)
            msg = "%s, but we got blown off course to %s!" % (msg, city(destination))
        else:
            msg = "%s!" % msg
        display.say(msg)
        display.update(hong)
    return destination

# =====================================================================================
# ▗▄▄▄  ▗▄▄▄▖ ▗▄▄▖▗▄▄▖ ▗▖    ▗▄▖▗▖  ▗▖
# ▐▌  █   █  ▐▌   ▐▌ ▐▌▐▌   ▐▌ ▐▌▝▚▞▘ 
# ▐▌  █   █   ▝▀▚▖▐▛▀▘ ▐▌   ▐▛▀▜▌ ▐▌  
# ▐▙▄▄▀ ▗▄█▄▖▗▄▄▞▘▐▌   ▐▙▄▄▖▐▌ ▐▌ ▐▌  

def i2a(n):
    return f'{n:<13,}'

def d2a(h):
    return "%s %d" % (calendar.month_name[h.month], h.year)

def o2a(o):
    return "\n".join([ "[%d] %s" % (i, o[i]) for i in range(len(o)) ])

def m2a(m):
    return "\n".join([ "[%s] %s" % (k.upper(), m[k]) for k in m ])

def s2l(t, w):
    l = [ ]
    for x in t.split('\n'):
        if len(x) > w:
            l.extend(textwrap.wrap(x, w))
        else:
            l.append(x)
    return l

# =================
# ┏┓┏┓┏┓┳┓┏┓
# ┃┓┃┃┃┃┃┃┗┓
# ┗┛┗┛┗┛┻┛┗┛
          
class GoodsWindow:

    def __init__(self, parent, top, left, name, special=False):
        self.height = 6 + NUM_GOODS + (3 if special else 0)
        self.window = parent.subwin(self.height, 30, top, left)
        self.window.box(0, 0)
        self.window.addstr(1, 2, name, curses.A_BOLD)
        for g in [ OPIUM, SILK, ARMS, GENERAL ]:
            self.window.addstr(3 + g, 3, "%8s: " % good(g))
        self.window.addstr(3 + NUM_GOODS, 3, "Capacity: ")
        if (special):
            self.window.addstr(5 + NUM_GOODS, 3, "Private Cargo: ")
        self.window.refresh()
        self.special = special

    def update(self, goods, capacity, cargo=None):
        for g in [ OPIUM, SILK, ARMS, GENERAL ]:
            self.window.addstr(3 + g, 13, i2a(goods[g]))
        self.window.addstr(3 + NUM_GOODS, 13, "Overloaded" if capacity < 0 else i2a(capacity))
        if self.special:
            if cargo:
                self.window.addstr(6 + NUM_GOODS, 5, cargo.description.title())
                self.window.addstr(7 + NUM_GOODS, 5, "Bound for %s" % city(cargo.destination))
            else:
                self.window.addstr(6 + NUM_GOODS, 5, "(none)            ")
                self.window.addstr(7 + NUM_GOODS, 5, "                  ")
        self.window.refresh()

# =================
# ┏┓┏┳┓┏┓┏┳┓┳┳┏┓
# ┗┓ ┃ ┣┫ ┃ ┃┃┗┓
# ┗┛ ┻ ┛┗ ┻ ┗┛┗┛

class StatusWindow:

    def __init__(self, parent, top, left):
        self.height = 12
        self.window = parent.subwin(self.height, 30, top, left)
        self.window.box(0, 0)
        self.window.addstr(1, 2, "CURRENT STATUS", curses.A_BOLD)
        self.window.addstr(3, 3, "Location: ")
        self.window.addstr(4, 3, "    Cash: ")
        self.window.addstr(5, 3, "    Debt: ")
        self.window.addstr(6, 3, "    Bank: ")
        self.window.addstr(7, 3, "    Guns: ")
        self.window.addstr(8, 3, " Rockets: ")
        self.window.addstr(9, 3, "  Repair: ")

    def update(self, hong):
        self.window.addstr(3, 13, "%-13s" % city(hong.location))
        self.window.addstr(4, 13, i2a(hong.cash))
        self.window.addstr(5, 13, i2a(hong.debt))
        self.window.addstr(6, 13, i2a(hong.bank))
        self.window.addstr(7, 13, i2a(hong.ship_guns))
        self.window.addstr(8, 13, i2a(hong.ship_rockets))
        self.window.addstr(9, 13, "%d %%" % hong.ship_repair)
        self.window.refresh()

# =================
# ┳┳┓┏┓┏┓┏┓┏┓┏┓┏┓
# ┃┃┃┣ ┗┓┗┓┣┫┃┓┣ 
# ┛ ┗┗┛┗┛┗┛┛┗┗┛┗┛

class MessageWindow:

    def __init__(self, parent, top, left, width):
        self.window = parent.subwin(40, 70, top, left)
        self.width = width

    def write(self, text):
        lines = s2l(text, self.width)
        stop = 0
        for i in range(20):
            s = ""
            if i < len(lines):
                s = lines[i]
            elif stop == 0:
                stop = i
            f = f'{s:<{self.width}}'
            self.window.addstr(3 + i, 4, f)
        self.window.refresh()
        return 3 + stop

    def update(self, hong):
        text = "%s'S REPORT - %s" % ("CAPTAIN" if hong.location == AT_SEA else "COMPRADOR", d2a(hong))
        self.window.addstr(1, 2, f'{text:<{self.width}}', curses.A_BOLD)

# =================
# ┳┓┳┏┓┏┓┓ ┏┓┓┏
# ┃┃┃┗┓┃┃┃ ┣┫┗┫
# ┻┛┻┗┛┣┛┗┛┛┗┗┛

class Display:

    def __init__(self, parent):
        (_, maxx) = parent.getmaxyx()
        self.message = MessageWindow(parent, 0, 0, 60)
        self.status = StatusWindow(parent, 0, maxx - 30)
        self.warehouse = GoodsWindow(parent, self.status.height, maxx - 30, "CANTON WAREHOUSE")
        self.hold = GoodsWindow(parent, self.status.height + self.warehouse.height, maxx - 30, "SHIP'S HOLD", True)
        self.window = parent
        self.prefix = ""

    def say(self, text):
        self.message.write("%s%s\n\n[Press any key]" % (self.prefix, text))
        self.window.refresh()
        self.window.getkey()

    def ask_yn(self, text):
        self.message.write("%s%s\n\n[Y/N]" % (self.prefix, text))
        self.window.refresh()
        while True:
            c = self.window.getkey()
            if c in 'Yy':
                return True
            if c in 'Nn':
                return False

    def ask_opt(self, text, opts, esc=False):
        return self.ask_opt2(text, [ (opts[i], i) for i in range(len(opts)) ], esc)

    def ask_opt2(self, text, opts, esc=False):
        l = "\n".join([ "  [%d] %s" % (i+1, opts[i][0]) for i in range(len(opts)) ])
        self.message.write("%s%s\n\n%s" % (self.prefix, text, l))
        self.window.refresh()
        while True:
            c = self.window.getch()
            if c == 27 and esc:
                return None
            if c > 48 and c < 48 + len(opts) + 1:
                return opts[c-49][1]
            for o in opts:
                if chr(c).upper() == o[0][0]:
                    return o[1]

    def ask_num(self, text, max_val=0):
        if max_val > 0:
            text = "%s%s (max is %s)" % (self.prefix, text, max_val)
        start = self.message.write(text)
        n = 0
        self.window.addstr(start + 2, 30, "%-15d" % n, curses.A_REVERSE or curses.A_BOLD);
        while True:
            c = self.window.getkey()
            if c.upper() == 'A':
                n = max_val
                # n = n / 10;
            elif c == '\n':
                return n
            else:
                try:
                    i = int(c)
                    n = n * 10 + i
                except:
                    n = int(n / 10)
            self.window.addstr(start + 2, 30, "%-15d" % n, curses.A_REVERSE or curses.A_BOLD)
        return n
    
# "                   v  ~.      v"
# "          v           /|"
# "                     / |          v"
# "              v     /__|__"
# "                  \--------/"
# "~~~~~~~~~~~~~~~~~~~`~~~~~~'~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"

#     __|__ |___| |\
#     |o__| |___| | \
#     |___| |___| |o \
#    _|___| |___| |__o\
#   /...\_____|___|____\_/
#   \   o * o * * o o  /
# ~~~~~~~~~~~~~~~~~~~~~~~~~~

    def update(self, hong):
        self.hold.update(hong.ship_goods, hong.ship_available(), hong.ship_cargo)
        self.warehouse.update(hong.warehouse_goods, hong.warehouse_available())
        self.status.update(hong)
        self.message.update(hong)

# =====================================================================================
# ▗▖  ▗▖ ▗▄▖ ▗▄▄▄▖▗▖  ▗▖    ▗▖    ▗▄▖  ▗▄▖ ▗▄▄▖ 
# ▐▛▚▞▜▌▐▌ ▐▌  █  ▐▛▚▖▐▌    ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▌ ▐▌
# ▐▌  ▐▌▐▛▀▜▌  █  ▐▌ ▝▜▌    ▐▌   ▐▌ ▐▌▐▌ ▐▌▐▛▀▘ 
# ▐▌  ▐▌▐▌ ▐▌▗▄█▄▖▐▌  ▐▌    ▐▙▄▄▖▝▚▄▞▘▝▚▄▞▘▐▌   

def main_loop():
    stdscr = curses.initscr()
    curses.noecho()
    curses.cbreak()

    try:

        curses.curs_set(0)
        curses.start_color()
        curses.use_default_colors()
        # curses.curs_set(0)

        d = Display(stdscr)
        h = Hong("Rising Sun", False)
        h.cash = 10000
        d.update(h)

        compradors_loop(h, d)

        # hong = Hong("Rising Sun")
        # display = Display(stdscr)
        # display.update(hong)

        # check_location_events(hong, display)
        # while True:
        #     next = comprador_loop(hong, display)
        #     sail_to(hong, display, next)

        # for i in range(10):
        #     check_prices(hong, display)
        #     display.say(str(hong.prices))

        # check_wu(hong, display)
        # check_li(hong, display)
        # check_warehouse_safety(hong, display)
        # check_personal_safety(hong, display)
        # check_police(hong, display)
        display.say("press any key to continue")

    finally:
        curses.nocbreak()
        curses.echo()
        curses.endwin()

if __name__ == '__main__':
    main_loop()
    # h = Hong("Rising Sun", False)
    # print(h.total_goods())
    # print(h.total_non_goods())
    # print(h.ship_available())
