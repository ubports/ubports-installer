"use strict";

/*
 * Copyright (C) 2022 UBports Foundation <info@ubports.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const axios = require("axios");

/**
 * paste stuff
 */
class Paste {
  /**
   * send paste
   * @async
   * @returns {String} url of the paste
   */
  async paste(logfile) {
    return axios
      .post(
        "https://snip.hxrsh.in/api/snip/new",
        {
          content: await logfile,
          slug: `ubi-${new Date().getTime()}`,
          language: "text"
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
      .then(({ data }) =>
        data.slug ? `https://snip.hxrsh.in/${data.slug}` : null
      )
      .catch(() => null);
  }
}

module.exports = new Paste();
