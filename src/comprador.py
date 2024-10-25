#!/usr/bin/env python3

import math

from randpan import randint
from display import i2a
from world import City, Goods, HONG_KONG

def comprador_loop(hong, display):
    msg = "Taipan, market conditions are as follows:\n\n%s\n\nWhat shall I do next?" % "\n".join([ "%10s: %s" % (g.txt(), i2a(hong.prices[g])) for g in Goods.list() ])
    opts = [
        ('B', "Buy goods", buy_goods),
        ('S', "Sell goods", sell_goods)
    ]
    if hong.transfer >= 0:
        opts.append(('T', "Transfer goods", visit_warehouse))
    if hong.location == HONG_KONG:
        opts.append(('V', "Visit the bank", visit_bank))
        opts.append(('W', "Visit Elder Brother Wu", visit_wu))
    opts.append(('L', "Leave port", leave_port))
    while True:
        f = display.ask_opt3(msg, opts)
        c = f(hong, display)
        if c != None:
            return c

# test - overloaded - refuse
# test - not overloaded - return city
def leave_port(hong, display):
    if hong.ship_available() < 0:
        display.say("Your ship is overloaded, Taipan.")
    else:
        c = City.prompt("Where shall we sail, Taipan?", display)
        if c:
            return c

# test - buy too much - refuse
# test - buy ok - adjust values
def buy_goods(hong, display):
    g = Goods.prompt("What shall I buy, Taipan?", display)
    if g == None:
        return
    x = math.floor(hong.cash / hong.prices[g])
    if x < 1:
        display.say("You cannot afford any %s at these prices, Taipan." % g.txt().lower())
        return
    n = display.ask_num("How much %s shall I buy, Taipan?" % g.txt().lower(), x)
    if not n:
        return
    p = hong.prices[g]
    a = p * n
    if a > hong.cash:
        display.say("You do not have enough cash on hand, Taipan.")
    else:
        hong.cash -= a
        hong.ship_goods[g] += n
        display.update(hong)

# test - sell something you don't have - refuse
# test - sell too much - refuse
# test - sell ok - adjust values
def sell_goods(hong, display):
    g = Goods.prompt("What shall I sell, Taipan?", display)
    if g == None:
        return
    if hong.ship_goods[g] < 1:
        display.say("You have no %s to sell, Taipan." % g.txt().lower())
        return
    n = display.ask_num("How much %s shall I sell, Taipan?" % g.txt().lower(), hong.ship_goods[g])
    if not n:
        return
    if n > hong.ship_goods[g]:
        display.say("You do not have enough in your ship's hold, Taipan.")
    else:
        hong.cash += hong.prices[g] * n
        hong.ship_goods[g] -= n
        display.update(hong)

# test - pick good you don't have -> refuse
# test - offload > ship -> refuse
# test - offload > warehouse -> refuse
# test - offload success -> adjust totals
# test - onboard > warehouse -> refuse
# test - onboard success -> adjust totals
def visit_warehouse(hong, display):
    g = Goods.prompt("What shall I transfer, Taipan?", display)
    if g == None:
        return
    if hong.warehouse_goods[g] == 0:
        if hong.ship_goods[g] == 0:
            display.say("You have no %s to transfer, Taipan." % g.txt().lower())
            return
        if hong.warehouse_available() == 0:
            display.say("You do not have enough space in the warehouse, Taipan.")
            return
    max_off = min(hong.ship_goods[g], hong.warehouse_available())
    if max_off > 0:
        n = display.ask_num("How much %s shall I offload from the ship, Taipan?" % g.txt().lower(), max_off)
        if n > hong.ship_goods[g]:
            display.say("You do not have that %s much on board, Taipan." % g.txt().lower())
        elif n > hong.warehouse_available():
            display.say("You do not have enough space in the warehouse, Taipan.")
        else:
            hong.ship_goods[g] -= n
            hong.warehouse_goods[g] += n
            display.update(hong)
    max_on = hong.warehouse_goods[g]
    if max_on:
        n = display.ask_num("How much shall %s I load onto the ship, Taipan?" % g.txt().lower(), max_on)
        if n > hong.warehouse_goods[g]:
            display.say("You do not have that much %s in the warehouse, Taipan." % g.txt().lower())
        else:
            hong.ship_goods[g] += n
            hong.warehouse_goods[g] -= n
            display.update(hong)

# test - deposit > cash -> refuse
# test - deposit < cash -> adjust totals
# test - withdraw > balance -> refuse
# test - withdraw < balance -> adjust totals
def visit_bank(hong, display):
    if hong.cash > 0:
        d = display.ask_num("How much shall I deposit?", hong.cash)
        if d > hong.cash:
            display.say("Taipan, you do not have that much cash.")
        elif d > 0:
            hong.bank += d
            hong.cash -= d
            display.update(hong)
    if hong.bank > 0:
        w = display.ask_num("How much shall I withdraw?", hong.bank)
        if w > hong.bank:
            display.say("Taipan, you do not have that much in the bank.")
        elif w > 0:
            hong.bank -= w
            hong.cash += w
            display.update(hong)

# test - broke -> will loan you money
# test - debt > cash -> will not loan you money
# test - debt < cash -> will loan up to 2 * diff
# test - borrow N < max -> adjust totals
# test - borrow N > max -> refuse
# test - repay N < cash -> adjust totals
# test - repay N > cash -> refuse
def visit_wu(hong, display):
    if hong.cash == 0:
        if hong.is_broke():
            loan = randint() % 1500 + 500
            debt = randint() % 2000 * (hong.bailed_out + 1) + 1500
            if display.ask_yn("Elder Brother is aware of your plight, Taipan. He is willing to loan you an additional %d if you will pay back %d. Are you willing, Taipan?" % (loan, debt)):
                hong.cash += loan
                hong.debt += debt
                hong.bailed_out += 1
                display.update(hong)
            return
        else:
            display.say("Elder Brother Wu is aware of your plight, Taipan, but will not assist you yet.")
    else:
        x = max((hong.cash - hong.debt) * 2, 0)
        if x > 0:
            d = display.ask_num("How much shall I borrow?", x)
            if d > 0:
                if x:
                    display.say("He won't loan you so much, Taipan!")
                else:
                    hong.debt += d
                    hong.cash += d
                    display.update(hong)
        if hong.debt > 0:
            w = display.ask_num("How much shall I repay?", min(hong.cash, hong.debt))
            if w > hong.cash:
                display.say("Taipan, you do not have that much cash.")
            elif w > 0:
                hong.cash -= min(w, hong.debt)
                hong.debt -= min(w, hong.debt)
                display.update(hong)

