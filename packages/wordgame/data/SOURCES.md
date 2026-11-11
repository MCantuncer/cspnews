# Word list sources

Every answer was proposed by `scripts/candidates.py` and then checked by hand. Words removed in that check are in each language's `blocked.txt` with the reason.

| Source                                                                                                                                                   | Used for                                                                              | Licence                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [SCOWL](http://wordlist.aspell.net/) by Kevin Atkinson, through the npm package [wordlist-english](https://www.npmjs.com/package/wordlist-english) 1.2.1 | English answers (sizes 10 to 40) and guesses (up to size 70)                          | SCOWL copyright notice, below; package MIT                                              |
| [Zemberek](https://github.com/ahmetaa/zemberek-nlp) dictionaries (`master-dictionary.dict`, `non-tdk.dict`)                                              | Turkish answers (root nouns, adjectives and adverbs) and guesses                      | Apache License 2.0, Copyright 2018 Ahmet A. Akın, Mehmet D. Akın                        |
| [wordfreq](https://github.com/rspeer/wordfreq) 3.1.1 by Robyn Speer                                                                                      | Ranking words by how common they are; extra guesses (inflected forms such as plurals) | Data CC BY-SA 4.0. The guess lists that include its words are shared under CC BY-SA 4.0 |
| [List of Dirty, Naughty, Obscene, and Otherwise Bad Words](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)             | Removing swear words from answers and guesses                                         | CC BY 4.0                                                                               |

## SCOWL copyright notice

Copyright 2000-2016 by Kevin Atkinson. Permission to use, copy, modify, distribute and sell these word lists, the associated scripts, the output created from the scripts, and its documentation for any purpose is hereby granted without fee, provided that the above copyright notice appears in all copies and that both that copyright notice and this permission notice appear in supporting documentation. Kevin Atkinson makes no representations about the suitability of this array for any purpose. It is provided "as is" without express or implied warranty.
