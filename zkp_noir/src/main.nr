fn main(
    lat_ref: pub u64,
    lon_ref: pub u64,
    max_distance_sq: pub u128,
    lat_donor: u64,   // private (witness)
    lon_donor: u64,   // private (witness)
) {
    // absolute difference for lat
    let dx: u64 = if lat_donor >= lat_ref {
        lat_donor - lat_ref
    } else {
        lat_ref - lat_donor
    };

    // absolute difference for lon
    let dy: u64 = if lon_donor >= lon_ref {
        lon_donor - lon_ref
    } else {
        lon_ref - lon_donor
    };

    // square in u128 to avoid overflow
    let dx_sq: u128 = (dx as u128) * (dx as u128);
    let dy_sq: u128 = (dy as u128) * (dy as u128);

    let dist_sq: u128 = dx_sq + dy_sq;

    // check that squared distance <= max_distance_sq
    assert(dist_sq <= max_distance_sq);
}


#[test]
fn inside_radius_passes() {
    let lat_ref: u64 = 100;
    let lon_ref: u64 = 200;
    let lat_donor: u64 = 101;  // dx = 1
    let lon_donor: u64 = 202;  // dy = 2

    // dist_sq = 1^2 + 2^2 = 5
    let max_distance_sq: u128 = 10;

    main(lat_ref, lon_ref, max_distance_sq, lat_donor, lon_donor);
}