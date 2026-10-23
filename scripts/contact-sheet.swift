// contact-sheet.swift <out.png> <cellWidth> <columns> <images...>: tiles screenshots into one image (used by ios-smoke.sh).
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let out = args[1]
let cellW = Int(args[2])!
let cols = Int(args[3])!
let paths = Array(args.dropFirst(4))
let images = paths.compactMap { p -> CGImage? in
  guard let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: p) as CFURL, nil) else { return nil }
  return CGImageSourceCreateImageAtIndex(s, 0, nil)
}
guard let first = images.first else { exit(1) }
let cellH = Int(Double(cellW) * Double(first.height) / Double(first.width))
let rows = (images.count + cols - 1) / cols
let gap = 6
let W = cols * cellW + (cols + 1) * gap, H = rows * cellH + (rows + 1) * gap
let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.setFillColor(CGColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
ctx.interpolationQuality = .high
for (i, img) in images.enumerated() {
  let r = i / cols, c = i % cols
  let h = Int(Double(cellW) * Double(img.height) / Double(img.width))
  let x = gap + c * (cellW + gap)
  let y = H - (gap + r * (cellH + gap)) - h
  ctx.draw(img, in: CGRect(x: x, y: y, width: cellW, height: h))
}
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: out) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
CGImageDestinationFinalize(dest)
