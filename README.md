# Control Loop

* Question is "Name your hong"; return type is string
* Question is "Do you want guns?"; return type is option (1/2)
* Question is "Will you pay?"; return type is bool
    * Question is "(nothing)"; return type is nothing
* Question is "Do you want visit EBW?"; return type is bool

# Feature Notes

## List

* Sailing
    * Storms
    * Pirate battle (regular fleet)
        * Running
        * Shooting
        * Throwing cargo
        * Interrupting
    * Pirate battle (Li Yuen)
* Bank
    * Deposit
    * Withdraw
* Trading
    * Buying
    * Selling
* Warehouse
    * Transferring goods
    * Lorcha for transport
    * Upgrade warehouse
* Shipyad
    * Buy gun
    * Buy ship
    * Repair ship
* Pirates
    * Extort
* Lender
    * Repay
    * Borrow

## Order of operations

* Startup
    * Check extortion (see below)
    * Check lender visit (see below)
    * Enter comprador's loop

* Comprador
    * Buy
    * Sell
    * Transfer
        * P: good (option)
            * P: failure (say)
            * P: amount (number)
                * P: failure (say)
    * Bank
        * P: failure (say)
        * P: deposit (number)
        * P: withdraw (number)
    * Lender
        * P: repay (number)
        * P: borrow (number)
    * Save & exit
        * P: result (say)
    * Sail
        * P: city (option)
        * P: failure (say)

* Sailing
    * Storm
        * P: announce (say)
        * P: warning (say)
        * P: result (say)
    * Pirates
        * P: announce (say)
        * P: all clear (say)

* Fighting
    * Run
        * P: result (say)
    * Fight:
        * P: announce (say)
        * P: result (say)
    * Dump:
        * See buy/sell/transfer
    * Interrupt
        * Announce (say)

* Arriving
    * Check extortion
        * P: summons (say)
        * P: request (y/n)
            * P: borrow (y/n)
                * P: result (say)
    * Check lender
        * P: summons (say x 4)
        * P: visit (y/n)
            * P: borrow (number)
            * P: repay (number)
    * Check shipyard
        * Repair
            * P: visit (y/n)
                * P: amount (number)
        * Ship
            * P: purchase (y/n)
        * Gun
            * P: purchase (y/n)
    * Check warehouse
        * Upgrade
            * P: purchase (y/n)
        * Fire
            * P: announce (say)
        * Lorcha
            * P: announce (say)
    * Check personal safety
        * Harbor cops
            * P: announce (say)
        * Muggers
            * P: announce (say)
    * Check special offers
        * Cargo
            * P: deliver (say)
            * P: offer (y/n)
        * Price shocks
            * P: announce (say)

# Files

* util
* actions
* world
* 
