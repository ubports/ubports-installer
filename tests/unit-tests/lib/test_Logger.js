"use strict";

/*
 * Copyright (C) 2017-2019 UBports Foundation <info@ubports.com>
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

const chai = require("chai");
const sinon = require("sinon");
const sinonChai = require("sinon-chai");
const expect = chai.expect;
chai.use(sinonChai);

const winston = require("winston");
const Logger = require("../../../src/lib/Logger.js");

const levels = ["error", "warn", "info", "debug", "command"];

describe("Logger module", function() {
  describe("constructor()", function() {
    it("should construct a singleton", function() {
      sinon.stub(winston, "transports").value({
        File: class {},
        Console: class {}
      });
      sinon.stub(winston, "createLogger").returns();
      sinon.stub(winston, "addColors");
      expect(new Logger() === new Logger());
      expect(winston.addColors).to.have.been.calledOnce;
      expect(winston.addColors).to.not.have.been.calledTwice;
    });
  });
  describe("get()", function() {
    it("should resolve log file contents", function() {
      const log = new Logger();
      log.winston = {
        query: sinon.fake((opts, cb) =>
          cb(null, {
            file: [{ level: "debug", message: "alrighty" }]
          })
        )
      };
      return log.get().then(result => {
        expect(result).to.eql("debug: alrighty");
        expect(log.winston.query).to.have.been.calledOnce;
      });
    });
    it("should reject on query error", function(done) {
      const log = new Logger();
      log.winston = {
        query: sinon.fake((opts, cb) => cb(1))
      };
      log.get().catch(e => {
        expect(e.message).to.eql("Failed to read log: 1");
        done();
      });
    });
    it("should reject on parsing error", function(done) {
      const log = new Logger();
      log.winston = {
        query: sinon.fake((opts, cb) => cb())
      };
      log.get().catch(e => {
        expect(e.message).to.eql(
          "Failed to read log: TypeError: Cannot read property 'file' of undefined"
        );
        done();
      });
    });
  });
  describe("setLevel()", function() {
    it("should update level", function() {
      sinon.stub(winston, "transports").value({
        File: class {},
        Console: class {}
      });
      sinon.stub(winston, "createLogger").returns();
      const log = new Logger();
      log.stdout.level = "info";
      log.setLevel("debug");
      expect(log.stdout.level).to.eql("debug");
    });
  });
  levels.forEach(level => {
    describe(`${level}()`, function() {
      it(`should log ${level}`, function() {
        const log = new Logger();
        log.winston = {
          log: sinon.spy()
        };
        log[level]("hello world");
        expect(log.winston.log).to.have.been.calledWith(level, "hello world");
      });
    });
  });
});
