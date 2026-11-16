package app

import (
	"context"
	"fmt"
	"strings"
)

// Fixtures live only on the backend. Inventory is inserted once, never replenished on restart.
func (a *App) Seed(ctx context.Context) error {
	tx, err := a.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(734287)`); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO sellers(id,name,rating) VALUES (1,'Pixel Harbor',4.92),(2,'Nova Keys',4.85),(3,'Level Up',4.76) ON CONFLICT DO NOTHING`); err != nil {
		return err
	}
	titles := []string{"Elden Ring", "Cyberpunk 2077", "Baldur's Gate 3", "Hogwarts Legacy", "Red Dead Redemption 2", "God of War", "Hades II", "Hollow Knight", "Stardew Valley", "No Man's Sky", "The Witcher 3", "Forza Horizon 5", "Starfield", "Resident Evil 4", "Death Stranding", "Sea of Thieves", "Doom Eternal", "Celeste", "Disco Elysium", "Monster Hunter World", "It Takes Two", "Control", "Outer Wilds", "Cities Skylines II"}
	genres := []string{"Adventure", "RPG", "Action", "Indie", "Simulation", "Racing"}
	for i, title := range titles {
		id := i + 1
		slug := strings.ReplaceAll(strings.ReplaceAll(strings.ToLower(title), "'", ""), " ", "-")
		if _, err = tx.Exec(ctx, `INSERT INTO products(id,slug,title,description,image,genre,popularity,discount) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`, id, slug, title, title+" — discover a new world, master your own adventure, and make every session count. This is an unofficial demo listing with original cover artwork. Purchases deliver non-activatable fake keys only.", fmt.Sprintf("/covers/%d.svg", id), genres[i%len(genres)], 1000-i*29, (i%5)*10); err != nil {
			return err
		}
		for seller := 1; seller <= 3; seller++ {
			offerID := id*10 + seller
			platform := "Steam"
			region := "Global"
			if seller == 2 {
				platform = "Xbox"
			}
			if seller == 3 {
				region = "Europe"
			}
			tag, err := tx.Exec(ctx, `INSERT INTO offers(id,product_id,seller_id,platform,region,price_cents) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, offerID, id, seller, platform, region, 799+(i*347)%4200+(seller-1)*230)
			if err != nil {
				return err
			}
			if tag.RowsAffected() > 0 {
				for n := 0; n < 12; n++ {
					if _, err = tx.Exec(ctx, `INSERT INTO key_inventory(offer_id,fake_key) VALUES($1,$2)`, offerID, fmt.Sprintf("DEMO-%04d-%02d-NOT-A-REAL-KEY", offerID, n)); err != nil {
						return err
					}
				}
			}
		}
	}
	_, err = tx.Exec(ctx, `INSERT INTO homepage_content(id,eyebrow,title,subtitle,cta,href) VALUES(1,'YOUR NEXT ADVENTURE STARTS HERE','Great games. Better deals.','Find your next obsession. Compare trusted demo sellers and play your way.','Explore the store','/store') ON CONFLICT DO NOTHING`)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
