import Foundation
import ImageIO
import Vision

// Reads the raster pixels that will be rendered. It deliberately reports a
// failure record rather than inventing a contour for a portrait Vision cannot
// resolve. Coordinates are source-image pixels, with a top-left origin.
func report(_ object: [String: Any]) {
  guard let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]),
        let line = String(data: data, encoding: .utf8) else { return }
  print(line)
}

for argument in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: argument)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    report(["file": url.lastPathComponent, "error": "image_decode_failed"])
    continue
  }

  do {
    let request = VNDetectFaceLandmarksRequest()
    try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
    guard let face = request.results?.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) else {
      report(["file": url.lastPathComponent, "size": [image.width, image.height], "error": "face_not_found"])
      continue
    }
    let useLeftEye = face.landmarks?.leftEye != nil
    guard let eye = useLeftEye ? face.landmarks?.leftEye : face.landmarks?.rightEye else {
      report(["file": url.lastPathComponent, "size": [image.width, image.height], "error": "eye_not_found"])
      continue
    }
    func pixels(_ region: VNFaceLandmarkRegion2D) -> [[Double]] {
      region.normalizedPoints.map { point in
        [Double((face.boundingBox.minX + CGFloat(point.x) * face.boundingBox.width) * CGFloat(image.width)),
         Double((1 - face.boundingBox.minY - CGFloat(point.y) * face.boundingBox.height) * CGFloat(image.height))]
      }
    }
    let points = pixels(eye)
    let minX = points.map { $0[0] }.min()!, maxX = points.map { $0[0] }.max()!
    let minY = points.map { $0[1] }.min()!, maxY = points.map { $0[1] }.max()!
    let side = max((maxX - minX) * 2.35, Double(face.boundingBox.width) * Double(image.width) * 0.2)
    let crop = [(minX + maxX - side) / 2, (minY + maxY - side) / 2, side]
    let pupilRegion = useLeftEye ? face.landmarks?.leftPupil : face.landmarks?.rightPupil
    let pupil = pupilRegion.map { pixels($0)[0] } ?? [(minX + maxX) / 2, (minY + maxY) / 2]
    report([
      "file": url.lastPathComponent,
      "size": [image.width, image.height],
      "crop": crop,
      "eye": points,
      "pupil": pupil,
      "eyeBounds": [minX, minY, maxX, maxY]
    ])
  } catch {
    report(["file": url.lastPathComponent, "size": [image.width, image.height], "error": "vision_failed"])
  }
}
