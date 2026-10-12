// ASCII art backdrops from pypan.py, plus a title banner.

import type { Art } from "../engine/prompts";

export const TITLE = String.raw`
 ____  _  _  ____   __   _  _
(  _ \( \/ )(  _ \ / _\ ( \( )
 ) __/ )  /  ) __//    \ )  (
(__)  (__/  (__)  \_/\_/(_)\_)
`.slice(1);

const STORM = String.raw`
     ,-'-.     _.,
      . (    '("'-'  ').
   ( ' ((  |.      )\/( )
    '(  )) | () |" |  | ')
       ( . ,-. ,-.. __.)
         /)  /  ' /
        /   /) / /
`.slice(1);

const PIRATES = String.raw`
  \_/
   |'."-._.-""--.-"-.__.-'/
   |  \       .-.        (
   |   |     (@.@)        )
   |   |   '=.|m|.='     /
   |  /    .='${"`"}"${"``"}=.    /
   |.-"-.__.-""-.__.-"-.)
   |
`.slice(1);

const BOAT = String.raw`
    __|__ |___| |\
    |o__| |___| | \
    |___| |___| |o \
   _|___| |___| |__o\
  /...\_____|___|____\_/
  \   o * o * * o o  /
~~~~~~~~~~~~~~~~~~~~~~~~~~
`.slice(1);

export const ART: Record<Art, string> = { storm: STORM, pirates: PIRATES, boat: BOAT };
