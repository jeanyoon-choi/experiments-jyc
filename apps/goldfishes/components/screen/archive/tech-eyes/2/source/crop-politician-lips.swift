import CoreGraphics
import Foundation
import ImageIO
import Vision

enum CropVersion: String, CaseIterable {
  case v1
  case v2
}

let sourceDirectory = URL(fileURLWithPath: "apps/goldfishes/public/images/grid-2/politicians", isDirectory: true)
let replacementSourceDirectory = URL(fileURLWithPath: "apps/goldfishes/public/images/0908/politician-lip-sources", isDirectory: true)
let outputRoot = "apps/goldfishes/public/images/0908/politician-lips"
let fileManager = FileManager.default
let portraitPattern = try NSRegularExpression(pattern: #"^\d{3}\.jpg$"#, options: [.caseInsensitive])

func matchesPortrait(_ name: String) -> Bool {
  portraitPattern.firstMatch(in: name, range: NSRange(name.startIndex..., in: name)) != nil
}

func cgImage(at url: URL) throws -> CGImage {
  guard
    let source = CGImageSourceCreateWithURL(url as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    throw NSError(domain: "PoliticianLipCrop", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not decode \(url.path)"])
  }
  return image
}

func largestFace(in image: CGImage) throws -> VNFaceObservation {
  let request = VNDetectFaceLandmarksRequest()
  try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
  guard let face = request.results?.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) else {
    throw NSError(domain: "PoliticianLipCrop", code: 2, userInfo: [NSLocalizedDescriptionKey: "No face detected"])
  }
  return face
}

func lipCrop(for face: VNFaceObservation, image: CGImage, version: CropVersion) throws -> CGImage {
  guard let lips = face.landmarks?.outerLips else {
    throw NSError(domain: "PoliticianLipCrop", code: 3, userInfo: [NSLocalizedDescriptionKey: "No outer-lip landmark detected"])
  }

  let points = lips.normalizedPoints
  let lipMinX = points.map(\.x).min() ?? 0.5
  let lipMaxX = points.map(\.x).max() ?? 0.5
  let lipMinY = points.map(\.y).min() ?? 0.5
  let lipMaxY = points.map(\.y).max() ?? 0.5
  let lipCenterX = face.boundingBox.minX + CGFloat((lipMinX + lipMaxX) / 2) * face.boundingBox.width
  let lipCenterY = face.boundingBox.minY + CGFloat((lipMinY + lipMaxY) / 2) * face.boundingBox.height
  let lipWidth = CGFloat(lipMaxX - lipMinX) * face.boundingBox.width * CGFloat(image.width)
  let lipHeight = CGFloat(lipMaxY - lipMinY) * face.boundingBox.height * CGFloat(image.height)
  let faceWidth = face.boundingBox.width * CGFloat(image.width)
  let cropWidth: CGFloat
  let cropHeight: CGFloat

  switch version {
  case .v1:
    let side = min(CGFloat(min(image.width, image.height)), max(lipWidth * 1.55, faceWidth * 0.28))
    cropWidth = side
    cropHeight = side
  case .v2:
    cropWidth = min(CGFloat(image.width), max(2, lipWidth * 1.18))
    cropHeight = min(CGFloat(image.height), max(2, max(lipHeight * 1.4, lipWidth * 0.42)))
  }

  let centerX = lipCenterX * CGFloat(image.width)
  let centerYFromTop = (1 - lipCenterY) * CGFloat(image.height)
  let originX = min(max(0, centerX - cropWidth / 2), CGFloat(image.width) - cropWidth)
  let originY = min(max(0, centerYFromTop - cropHeight / 2), CGFloat(image.height) - cropHeight)
  let cropRect = CGRect(x: floor(originX), y: floor(originY), width: floor(cropWidth), height: floor(cropHeight)).integral

  guard let crop = image.cropping(to: cropRect) else {
    throw NSError(domain: "PoliticianLipCrop", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not crop lips"])
  }
  return crop
}

func writeJPEG(_ image: CGImage, to url: URL) throws {
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.jpeg" as CFString, 1, nil) else {
    throw NSError(domain: "PoliticianLipCrop", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not create \(url.path)"])
  }
  CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.94] as CFDictionary)
  guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "PoliticianLipCrop", code: 6, userInfo: [NSLocalizedDescriptionKey: "Could not write \(url.path)"])
  }
}

let sourceFiles = try fileManager.contentsOfDirectory(at: sourceDirectory, includingPropertiesForKeys: nil)
  .filter { matchesPortrait($0.lastPathComponent) }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

guard sourceFiles.count == 60 else {
  throw NSError(domain: "PoliticianLipCrop", code: 7, userInfo: [NSLocalizedDescriptionKey: "Expected 60 portraits, found \(sourceFiles.count)"])
}

for version in CropVersion.allCases {
  let outputDirectory = URL(fileURLWithPath: "\(outputRoot)-\(version.rawValue)", isDirectory: true)
  try fileManager.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
  var expectedOutputs = Set<String>()

  for sourceURL in sourceFiles {
    let identifier = sourceURL.deletingPathExtension().lastPathComponent
    let replacementURL = replacementSourceDirectory.appendingPathComponent("\(identifier).jpg")
    let cropSourceURL = fileManager.fileExists(atPath: replacementURL.path) ? replacementURL : sourceURL
    let outputName = "\(identifier).jpg"
    let outputURL = outputDirectory.appendingPathComponent(outputName)
    do {
      let image = try cgImage(at: cropSourceURL)
      let face = try largestFace(in: image)
      try writeJPEG(try lipCrop(for: face, image: image, version: version), to: outputURL)
      expectedOutputs.insert(outputName)
      print("\(version.rawValue) \(identifier) \(image.width)x\(image.height) -> \(outputName)")
    } catch {
      throw NSError(domain: "PoliticianLipCrop", code: 8, userInfo: [NSLocalizedDescriptionKey: "\(sourceURL.lastPathComponent): \(error.localizedDescription)"])
    }
  }

  for url in try fileManager.contentsOfDirectory(at: outputDirectory, includingPropertiesForKeys: nil) {
    if matchesPortrait(url.lastPathComponent), !expectedOutputs.contains(url.lastPathComponent) {
      try fileManager.removeItem(at: url)
    }
  }
}
