import { AipCore } from './core'
import { AipDevices } from './devices'
import { AipChannels } from './channels'
import { AipWebserver } from './webserver'

const core = new AipCore()

export const aipCore       = core
export const aipDevices    = new AipDevices(core)
export const aipChannels   = new AipChannels(core)
export const aipWebserver  = new AipWebserver(core)
