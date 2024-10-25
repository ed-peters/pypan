#!/usr/bin/env python3

import calendar
import curses
import textwrap

from world import OPIUM, SILK, ARMS, GENERAL, AT_SEA

# =====================================================================
# HELPERS
# =====================================================================

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

# =====================================================================
# GOODS
# =====================================================================

class GoodsWindow:

    def __init__(self, parent, top, left, name):
        self.window = parent.subwin(10, 30, top, left)
        self.window.box(0, 0)
        self.window.addstr(1, 2, name, curses.A_BOLD)
        self.window.addstr(3, 3, "   Opium: ")
        self.window.addstr(4, 3, "    Silk: ")
        self.window.addstr(5, 3, "    Arms: ")
        self.window.addstr(6, 3, " General: ")
        self.window.addstr(7, 3, "Capacity: ")

    def update(self, goods, capacity):
        self.window.addstr(3, 13, i2a(goods[OPIUM]))
        self.window.addstr(4, 13, i2a(goods[SILK]))
        self.window.addstr(5, 13, i2a(goods[ARMS]))
        self.window.addstr(6, 13, i2a(goods[GENERAL]))
        self.window.addstr(7, 13, "Overloaded" if capacity < 0 else i2a(capacity))
        self.window.refresh()

# =====================================================================
# STATUS
# =====================================================================

class StatusWindow:

    def __init__(self, parent, top, left):
        self.window = parent.subwin(11, 30, top, left)
        self.window.box(0, 0)
        self.window.addstr(1, 2, "CURRENT STATUS", curses.A_BOLD)
        self.window.addstr(3, 3, "Location: ")
        self.window.addstr(4, 3, "    Cash: ")
        self.window.addstr(5, 3, "    Debt: ")
        self.window.addstr(6, 3, "    Bank: ")
        self.window.addstr(7, 3, "    Guns: ")
        self.window.addstr(8, 3, "  Repair: ")

    def update(self, hong):
        self.window.addstr(3, 13, f"{hong.location:<13}")
        self.window.addstr(4, 13, i2a(hong.cash))
        self.window.addstr(5, 13, i2a(hong.debt))
        self.window.addstr(6, 13, i2a(hong.bank))
        self.window.addstr(7, 13, i2a(hong.ship_guns))
        self.window.addstr(8, 13, "%d %%" % hong.ship_repair)
        self.window.refresh()

# =====================================================================
# MESSAGE
# =====================================================================

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
        d = d2a(hong)
        r = "CAPTAIN" if hong.location == AT_SEA else "COMPRADOR"
        s = "%s'S REPORT - %s" % (r, d)
        self.window.addstr(1, 2, f'{s:<{self.width}}', curses.A_BOLD)

# =====================================================================
# DISPLAY
# =====================================================================

class Display:

    def __init__(self, parent):
        (_, maxx) = parent.getmaxyx()
        self.status = StatusWindow(parent, 0, maxx - 30)
        self.hold = GoodsWindow(parent, 11, maxx - 30, "SHIP'S HOLD")
        self.warehouse = GoodsWindow(parent, 21, maxx - 30, "CANTON WAREHOUSE")
        self.message = MessageWindow(parent, 0, 0, 60)
        self.window = parent

    def say(self, text):
        self.message.write("%s\n\n[Press any key]" % text)
        self.window.refresh()
        self.window.getkey()

    def ask_yn(self, text):
        self.message.write("%s\n\n[Y/N]" % text)
        self.window.refresh()
        while True:
            c = self.window.getkey()
            if c in 'Yy':
                return True
            if c in 'Nn':
                return False

    def ask_opt2(self, text, opts):
        opts = [ (str(i), opts[i][0], opts[i][1]) for i in range(len(opts)) ]
        return self.ask_opt3(text, opts)

    def ask_opt3(self, text, opts, esc=False):
        l = "\n".join([ "  [%s] %s" % (str(o[0]).upper(), o[1]) for o in opts ])
        self.message.write("%s\n\n%s" % (text, l))
        self.window.refresh()
        while True:
            c = self.window.getch()
            if c == 27 and esc:
                return None
            for o in opts:
                if c == ord(o[0].lower()):
                    return o[2]

    def ask_num(self, text, max_val=0):
        if max_val > 0:
            text = "%s (max is %s)" % (text, max_val)
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
                    n = n / 10
            self.window.addstr(start + 2, 30, "%-15d" % n, curses.A_REVERSE or curses.A_BOLD)
        return n

    def update(self, hong):
        self.hold.update(hong.ship_goods, hong.ship_available())
        self.warehouse.update(hong.warehouse_goods, hong.warehouse_available())
        self.status.update(hong)
        self.message.update(hong)

